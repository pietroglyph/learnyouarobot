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
	Name     string
	Address  string
	Jobs     *DeployQueue `json:"-"`
	RobotLog chan string  `json:"-"`
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

// Initialize initializes fields that would otherwise be nil when a DeployTarget
// is unmarshalled in some fashion. This function is not thread-safe.
func (t *DeployTarget) Initialize() {
	t.Jobs = NewDeployQueue()
	t.RobotLog = make(chan string, config.ChannelBufferSize)
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
	job, err := t.Jobs.CurrentJob()
	if err != nil {
		return err
	}

	deployDirectoryMux.Lock()
	defer deployDirectoryMux.Unlock()

	lessonAbsPath, err := filepath.Abs(job.Lesson.Path)
	if err != nil {
		return err
	}
	symlinkPath := filepath.Join(config.BuildDirectory, srcSubDirectory, job.Lesson.Name+config.LessonFileSuffix)

	err = os.Remove(symlinkPath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	err = os.Symlink(lessonAbsPath, symlinkPath)
	if err != nil {
		return err
	}

	taskName := deployTaskName
	if t.Name == dryRunLessonName {
		taskName = dryRunTaskName
	}

	path, err := filepath.Abs(filepath.Join(config.BuildDirectory, buildScriptName))
	if err != nil {
		return err
	}
	cmd := exec.Command(path,
		taskName,
		"-PtargetAddress="+t.Address,
		"-PclassName="+job.Lesson.Name,
	)
	cmd.Dir = config.BuildDirectory

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	// TODO: Give stderr special formatting
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	go job.updateBuildOutputFromReader(io.MultiReader(stdout, stderr))

	err = cmd.Run()

	// Cancel dry runs immediately after compilation
	if t.Name == dryRunLessonName {
		_ = t.Jobs.RemoveJob(job.ID) // We ignore the error because the job may be done
	}

	_, isExitError := err.(*exec.ExitError)
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
		q.ModificationSignal <- true
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
	q.mux.Lock()
	defer q.mux.Unlock()
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
