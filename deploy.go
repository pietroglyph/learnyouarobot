package main

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"net"
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
	Address net.IP
	Jobs    *DeployQueue

	RobotLog chan string
}

// DeployQueue is a synchronized, readable, and cancellable queue of deploy jobs.
type DeployQueue struct {
	JobAddedSignal chan bool

	queue []*DeployJob
	mux   sync.RWMutex
}

// DeployJob stores a unique ID, a lesson to be deployed, and a build output channel.
type DeployJob struct {
	// The two below fields are assumed to be read-only if we wish to avoid data races
	ID     uuid.UUID
	Lesson *Lesson

	BuildOutput chan string
}

// NewDeployTarget returns a deployment target with the specified name and IP
func NewDeployTarget(name string, address net.IP) *DeployTarget {
	target := &DeployTarget{
		Name:     name,
		Address:  address,
		Jobs:     &DeployQueue{},
		RobotLog: make(chan string, config.RobotLogBufferSize),
	}

	return target
}

// KeepJobsRunning is a long-running function that makes sure all jobs added to
// a deploy target are run.
func (t *DeployTarget) KeepJobsRunning() {
	for {
		<-t.Jobs.JobAddedSignal
		for !t.Jobs.IsEmpty() {
			err := t.RunNextJob()
			if err != nil {
				log.Println("Couldn't run a job: ", err)
			}
		}
	}
}

// RunNextJob runs the next job and waits for it to complete.
func (t *DeployTarget) RunNextJob() error {
	job, err := t.Jobs.PopJob()
	if err != nil {
		return err
	}
	deployDirectoryMux.Lock()
	defer deployDirectoryMux.Unlock()
	os.Symlink(job.Lesson.Path, filepath.Join(config.BuildDirectory, srcSubDirectory))

	cmd := exec.Command(filepath.Join(config.BuildDirectory, buildScriptName),
		"deploy",
		"-PtargetAddress", t.Address.String(),
		"-PclassName", job.Lesson.Name,
	)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	go job.updateBuildOutputFromReader(stdout)
	return cmd.Run()
}

// NewDeployQueue makes a new deploy queue. If this is not used the JobAddedSignal
// chan will not be made.
func NewDeployQueue() *DeployQueue {
	return &DeployQueue{
		JobAddedSignal: make(chan bool),
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
		return q.removeElement(i)
	}
	return fmt.Errorf("Couldn't find a job with ID '%s' to remove from deployment queue", idToRemove.String())
}

// AddJob adds a job to a *DeployQueue
func (q *DeployQueue) AddJob(job *DeployJob) error {
	q.mux.Lock()
	q.queue = append(q.queue, job)
	q.mux.Unlock()
	select {
	case q.JobAddedSignal <- true:
	default:
		return fmt.Errorf("Couldn't send to a job added signal on a deploy queue")
	}
	return nil
}

// PopJob pops the next job off the top of a *DeployQueue in a thread-safe fashion.
// It will return an error if the queue is empty
func (q *DeployQueue) PopJob() (*DeployJob, error) {
	q.mux.Lock()
	defer q.mux.Unlock()
	if len(q.queue) < 0 {
		return nil, fmt.Errorf("Deployment queue is empty")
	}

	job := q.queue[0]
	q.removeElement(0)
	return job, nil
}

// IsEmpty checks if a *DeployQueue has any jobs in a thread-safe fashion.
func (q *DeployQueue) IsEmpty() bool {
	q.mux.RLock()
	defer q.mux.RUnlock()
	return len(q.queue) <= 0
}

// Does not synchronize or check if index is in bounds!
// That's the responsibility of the user.
func (q *DeployQueue) removeElement(i int) error {
	// This magic incantation avoids memory leaks
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
}
