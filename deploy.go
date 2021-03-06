package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/google/uuid"
)

// DeployTarget is a named IP address to deploy code to.
type DeployTarget struct {
	// The three below fields are assumed to be read-only if we wish to avoid data races
	Name    string
	Address string
	Jobs    *DeployQueue `json:"-"`

	log *robotLog
}

// DeployQueue is a synchronized, readable, and cancellable queue of deploy jobs.
type DeployQueue struct {
	ModificationSignal chan bool

	lastJob *DeployJob
	queue   []*DeployJob
	mux     sync.RWMutex
}

// DeployJob stores a unique ID, a lesson to be deployed, and a build output channel.
type DeployJob struct {
	// The two below fields are assumed to be read-only if we wish to avoid data races
	ID     uuid.UUID
	Lesson *Lesson

	CancelledSignal chan bool
	BuildOutput     chan string
}

// robotLog allows multiple concurrent reads of a buffer of RIO Log output lines via channels
type robotLog struct {
	mux         sync.Mutex
	recievers   []logChan
	updaterOnce sync.Once
}

// logChan holds a buffered channel of log lines, and buffer size 1 channel for closing
type logChan struct {
	Output chan string
	Done   chan bool
}

// Initialize initializes fields that would otherwise be nil when a DeployTarget
// is unmarshalled in some fashion. This function is not thread-safe.
func (t *DeployTarget) Initialize() {
	t.Jobs = NewDeployQueue()
	t.log = &robotLog{
		updaterOnce: sync.Once{},
	}
}

// KeepJobsRunning is a long-running function that makes sure all jobs added to
// a deploy target are run.
func (t *DeployTarget) KeepJobsRunning() {
	for {
		<-t.Jobs.ModificationSignal
		for t.Jobs.IsNewJobReady() {
			err := t.RunCurrentJob()
			if err != nil {
				log.Println("Couldn't run a job:", err)
			}
		}
	}
}

// RunCurrentJob runs the last job in the queue and waits for it to complete.
func (t *DeployTarget) RunCurrentJob() error {
	var (
		shouldCancel bool
		err          error
		job          *DeployJob
	)
	deployDirectoryMux.Lock()
	defer func() {
		deployDirectoryMux.Unlock()
		if job != nil && (shouldCancel || err != nil) {
			_ = t.Jobs.RemoveJob(job.ID) // We ignore the error because the job may be done
		}
	}()

	job, err = t.Jobs.CurrentJob()
	if err != nil {
		return err
	}

	lessonAbsPath, err := filepath.Abs(job.Lesson.Path)
	if err != nil {
		return err
	}
	symlinkPath := filepath.Join(config.BuildDirectory, srcSubDirectory, lessonClassName+config.LessonFileSuffix)

	err = os.Remove(symlinkPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	err = os.Symlink(lessonAbsPath, symlinkPath)
	if err != nil {
		return err
	}

	alternateRobotSymlinkPath := filepath.Join(config.BuildDirectory, srcSubDirectory, alternateDirectoryName)
	err = os.Remove(alternateRobotSymlinkPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	className := lessonClassName
	if job.Lesson.AlternateRobotPath != "" {
		alternateRobotDir, alternateRobotFileName := filepath.Split(job.Lesson.AlternateRobotPath)
		err = os.Symlink(alternateRobotDir, alternateRobotSymlinkPath)
		if err != nil {
			return err
		}

		className = alternateDirectoryName + "." + strings.TrimSuffix(alternateRobotFileName, config.LessonFileSuffix)
	}

	taskName := deployTaskName
	if t.Name == dryRunTargetName {
		taskName = dryRunTaskName
	}

	path, err := filepath.Abs(filepath.Join(config.BuildDirectory, buildScriptName))
	if err != nil {
		return err
	}
	cmd := exec.Command(path,
		taskName,
		"-PtargetAddress="+t.Address,
		"-PclassName="+className,
		"--console=plain",
	)
	cmd.Dir = config.BuildDirectory

	stdall, err := makeMultiReader(cmd)
	if err != nil {
		return err
	}
	go job.updateBuildOutputFromReader(stdall)

	// This is the much faster equivalent to a "gradlew clean". We need it because
	// the build fails if you switch main class files without cleaning.
	err = os.RemoveAll(filepath.Join(config.BuildDirectory, "build"))
	if err != nil {
		return err
	}

	err = cmd.Run()

	_, isExitError := err.(*exec.ExitError)
	if isExitError || t.Name == dryRunTargetName {
		shouldCancel = true // If the build failed/this is a dry run we immediately cancel the job
	}

	if err != nil && !isExitError {
		return err
	}
	return nil
}

// NewDeployQueue makes a new deploy queue. If this is not used the JobAddedSignal
// chan will not be made.
func NewDeployQueue() *DeployQueue {
	return &DeployQueue{
		ModificationSignal: make(chan bool, 1),
	}
}

func (q *DeployQueue) String() string {
	q.mux.RLock()
	defer q.mux.RUnlock()

	var output string
	for i, v := range q.queue {
		if i != 0 {
			output += ", "
		}
		output += v.Lesson.Owner.Name
	}
	return output
}

// RemoveJob removes a job from a *DeployQueue by its UUID
func (q *DeployQueue) RemoveJob(idToRemove uuid.UUID) error {
	q.mux.Lock()
	defer q.mux.Unlock()

	for i := range q.queue {
		if q.queue[i].ID != idToRemove {
			continue
		}
		select {
		case q.ModificationSignal <- true:
		default:
		}
		q.queue[i].CancelledSignal <- true
		return q.removeElement(i)
	}
	return fmt.Errorf("Couldn't find a job with ID '%s' to remove from deployment queue", idToRemove.String())
}

// AddNewJob makes a new job and adds it to a *DeployQueue
func (q *DeployQueue) AddNewJob(lesson *Lesson) (*DeployJob, error) {
	uuid, err := uuid.NewRandom()
	if err != nil {
		return nil, err
	}

	job := &DeployJob{
		ID:              uuid,
		Lesson:          lesson,
		CancelledSignal: make(chan bool, 1),
		BuildOutput:     make(chan string, config.ChannelBufferSize),
	}

	q.mux.Lock()
	q.queue = append(q.queue, job)
	q.mux.Unlock()

	select {
	case q.ModificationSignal <- true:
	default:
	}
	return job, nil
}

// CurrentJob gets the next job in a *DeployQueue.
// It will return an error if the queue is empty.
func (q *DeployQueue) CurrentJob() (*DeployJob, error) {
	q.mux.RLock()
	defer q.mux.RUnlock()
	if len(q.queue) < 1 {
		return nil, fmt.Errorf("Deployment queue is empty")
	}
	return q.queue[0], nil
}

// IsNewJobReady checks if a *DeployQueue has any jobs in a thread-safe fashion.
func (q *DeployQueue) IsNewJobReady() bool {
	currentJob, _ := q.CurrentJob() // Yes, nil is a valid "next job"

	// We must lock _after_ getting the current job, or we'll cause a deadlock
	q.mux.RLock()
	defer q.mux.RUnlock()
	jobReady := q.lastJob != currentJob
	q.lastJob = currentJob
	if currentJob == nil {
		// We need to do the above to get everything set up, but if there's no current
		// job then we don't want to say we're ready
		jobReady = false
	}
	return jobReady
}

// Does not synchronize!
// That's the responsibility of the user.
func (q *DeployQueue) removeElement(i int) error {
	if len(q.queue) < i {
		return fmt.Errorf("Cannot remove out of bounds index %d on a deploy queue", i)
	}
	// This magic incantation avoids memory leaks while deleting an element
	copy(q.queue[i:], q.queue[i+1:])
	q.queue[len(q.queue)-1] = nil // or the zero vq.queuelue of T
	q.queue = q.queue[:len(q.queue)-1]
	return nil
}

func (j *DeployJob) updateBuildOutputFromReader(r io.Reader) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		j.BuildOutput <- scanner.Text()
	}
	close(j.BuildOutput)
}

// GetLogChan gets buffered a channel that will have build output written
// to it. If it is not read from, it will be closed. When the consumer is done
// with the channel, they should send true on the second returned channel.
func (t *DeployTarget) GetLogChan() (text chan string, done chan bool) {
	text = make(chan string, config.ChannelBufferSize)
	done = make(chan bool, 1)

	t.log.mux.Lock()
	t.log.recievers = append(t.log.recievers, logChan{
		Output: text,
		Done:   done,
	})
	t.log.mux.Unlock()

	go t.log.updaterOnce.Do(t.keepLogUpdated)

	return
}

func (t *DeployTarget) keepLogUpdated() {
	path, err := filepath.Abs(filepath.Join(config.BuildDirectory, buildScriptName))
	if err != nil {
		log.Println(err)
		return
	}
	cmd := exec.Command(path,
		"riolog",
		"-PclassName='none'", // Class name needs to be set, but is unused
		"-PtargetAddress="+t.Address,
		"--quiet",
		"--console=plain")
	cmd.Dir = config.BuildDirectory

	stdall, err := makeMultiReader(cmd)
	if err != nil {
		log.Println(err)
		return
	}

	err = cmd.Start()
	if err != nil {
		log.Println(err)
		return
	}

	scanner := bufio.NewScanner(stdall)

	for scanner.Scan() {
		outputLine := scanner.Text()
		t.log.mux.Lock()
		for i, c := range t.log.recievers {
			select {
			case c.Output <- outputLine:
			case <-c.Done:
				// Remove this reciever on done signal
				t.log.recievers = append(t.log.recievers[:i], t.log.recievers[i+1:]...)
				close(c.Output)
				close(c.Done)
			default:
			}
		}
		t.log.mux.Unlock()
	}
}

func makeMultiReader(cmd *exec.Cmd) (io.Reader, error) {
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	// TODO: Give stderr special formatting
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	return io.MultiReader(stdout, stderr), nil
}
