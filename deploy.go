package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
)

// DeployTarget is a named IP address to deploy code to.
type DeployTarget struct {
	// The three below fields are assumed to be read-only if we wish to avoid data races
	Name    string
	Address string
	Jobs    *DeployQueue `json:"-"`
	Log     *RobotLog    `json:"-"`
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

// RobotLog allows multiple concurrent reads of a buffer of RIOLog output
type RobotLog struct {
	mux         sync.Mutex
	recievers   []chan string
	updaterOnce sync.Once
}

// Initialize initializes fields that would otherwise be nil when a DeployTarget
// is unmarshalled in some fashion. This function is not thread-safe.
func (t *DeployTarget) Initialize() {
	t.Jobs = NewDeployQueue()
	t.Log = &RobotLog{
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

// RunCurrentJob runs the next job and waits for it to complete.
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
	symlinkPath := filepath.Join(config.BuildDirectory, srcSubDirectory, lessonName+config.LessonFileSuffix)

	err = os.Remove(symlinkPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	err = os.Symlink(lessonAbsPath, symlinkPath)
	if err != nil {
		return err
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
		"-PclassName="+lessonName,
	)
	cmd.Dir = config.BuildDirectory

	stdall, err := makeMultiReader(cmd)
	if err != nil {
		return err
	}
	go job.updateBuildOutputFromReader(stdall)

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
		case q.queue[i].CancelledSignal <- true:
		default:
		}
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

// Does not synchronize or check if index is in bounds!
// That's the responsibility of the user.
func (q *DeployQueue) removeElement(i int) error {
	if len(q.queue) < i {
		return fmt.Errorf("Cannot remove out of bounds index %d on a deploy queue", i)
	}
	// This magic incantation avoids memory leaks while deleting an element
	q.queue[i] = q.queue[len(q.queue)-1]
	q.queue[len(q.queue)-1] = nil
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

// GetOutputChan gets buffered a channel that will have build output written
// to it. If it is nor read from, it will be closed. When the consumer is done
// with the channel, it should be closed.
func (l *RobotLog) GetOutputChan() chan string {
	chanToReturn := make(chan string, config.ChannelBufferSize)

	l.mux.Lock()
	l.recievers = append(l.recievers, chanToReturn)
	l.mux.Unlock()

	l.updaterOnce.Do(l.keepUpdated)

	return chanToReturn
}

func (l *RobotLog) keepUpdated() {
	path, err := filepath.Abs(filepath.Join(config.BuildDirectory, buildScriptName))
	if err != nil {
		log.Println(err)
		return
	}
	cmd := exec.Command(path,
		"riolog") // TODO

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
		l.mux.Lock()
		for i, c := range l.recievers {
			select {
			case c <- outputLine:
			default:
				l.recievers = append(l.recievers[:i], l.recievers[i+1:]...)
			}
		}
		l.mux.Unlock()
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
