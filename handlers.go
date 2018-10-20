package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
)

func handleLogin(w http.ResponseWriter, r *http.Request) {
	name := r.PostFormValue("name")
	if name == "" {
		http.Error(w, "'username' form value cannot be missing or empty", http.StatusBadRequest)
		return
	}

	_, exists, err := users.Add(name)
	if err != nil && !exists {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:    loginCookieName,
		Value:   name,
		Path:    "/",
		Expires: time.Now().AddDate(0, 1, 0), // One month from now
	})

	fmt.Fprint(w, "Login successful.")
}

func handleGetUserLessons(w http.ResponseWriter, r *http.Request) {
	user, err := GetCurrentUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	lessons, err := user.Lessons()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(lessons.Slice())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

func handleGetLesson(w http.ResponseWriter, r *http.Request) {
	user, err := GetCurrentUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	lessonName := r.URL.Query().Get("lesson")
	if lessonName == "" {
		http.Error(w, "'lesson' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	lessons, err := user.Lessons()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	lesson, exists := lessons[lessonName]
	if !exists {
		http.Error(w, "Lesson "+lessonName+" doesn't exist", http.StatusBadRequest)
		return
	}

	io.Copy(w, lesson.Reader())
}

func handleSaveLesson(w http.ResponseWriter, r *http.Request) {
	user, err := GetCurrentUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	lessonName := r.PostFormValue("lesson")
	if lessonName == "" {
		http.Error(w, "'lesson' form value cannot be missing or empty", http.StatusBadRequest)
		return
	}

	code := r.PostFormValue("code")
	if code == "" {
		http.Error(w, "'code' form value cannot be missing or empty", http.StatusBadRequest)
		return
	}

	lessons, err := user.Lessons()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	lesson, exists := lessons[lessonName]
	if !exists {
		http.Error(w, "no lesson by the name '"+lessonName+"' exists", http.StatusBadRequest)
		return
	}

	err = lesson.SaveCode(code)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func handleDeployLesson(w http.ResponseWriter, r *http.Request) {
	user, err := GetCurrentUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	targetName := r.URL.Query().Get("target")
	if targetName == "" {
		http.Error(w, "'target' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	lessonName := r.URL.Query().Get("lesson")
	if lessonName == "" {
		http.Error(w, "'lesson' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	lessons, err := user.Lessons()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	lesson, exists := lessons[lessonName]
	if !exists {
		http.Error(w, "User "+user.Name+" doesn't have a lesson by name "+lessonName, http.StatusBadRequest)
		return
	}

	var target *DeployTarget
	for _, v := range deployTargets {
		if v.Name == targetName {
			target = v
			break
		}
	}
	if target == nil {
		http.Error(w, "No target named "+targetName+" found", http.StatusBadRequest)
		return
	}

	job, err := target.Jobs.AddNewJob(lesson)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeMux := sync.Mutex{}
	writeMux.Lock()
	// There's very little we can do with this error. If it's a big deal we'll
	// figure it out in the below goroutine
	_ = conn.WriteMessage(websocket.TextMessage, []byte(job.ID.String()))

	conn.SetReadDeadline(time.Now().Add(websocketReadTimeout))
	go func() {
		ticker := time.NewTicker(websocketReadTimeout / 4)
		defer func() {
			// Wait for all output to be sent before closing the connection
			writeMux.Lock()
			conn.Close()
			writeMux.Unlock()
		}()

		for {
			<-ticker.C

			select {
			case <-job.CancelledSignal:
				return
			default:
			}
			_, _, err = conn.ReadMessage()
			if err != nil {
				// Returns an error if the job has ended, but we can safely ignore it
				_ = target.Jobs.RemoveJob(job.ID)
				return
			}
			conn.SetReadDeadline(time.Now().Add(websocketReadTimeout))
		}
	}()

	for line := range job.BuildOutput {
		// There's very little meaningful we can do with the error here, other than
		// print it, which creates a lot of noise for mundane network errors.
		_ = conn.WriteMessage(websocket.TextMessage, []byte(line))
	}
	writeMux.Unlock()
}

func handleCancelDeploy(w http.ResponseWriter, r *http.Request) {
	targetName := r.URL.Query().Get("target")
	if targetName == "" {
		http.Error(w, "'target' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	jobIDString := r.URL.Query().Get("jobid")
	if jobIDString == "" {
		http.Error(w, "'jobid' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	jobID, err := uuid.Parse(jobIDString)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var target *DeployTarget
	for _, v := range deployTargets {
		if v.Name == targetName {
			target = v
			break
		}
	}

	err = target.Jobs.RemoveJob(jobID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func handleGetDeployTargets(w http.ResponseWriter, r *http.Request) {
	rawJSON, err := json.Marshal(deployTargets)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Write(rawJSON)
}

func handleGetDeployQueue(w http.ResponseWriter, r *http.Request) {
	targetName := r.URL.Query().Get("target")
	if targetName == "" {
		http.Error(w, "'target' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	for _, v := range deployTargets {
		if v.Name == targetName {
			fmt.Fprint(w, v.Jobs.String())
			return
		}
	}
	http.Error(w, "no target by name "+targetName+" found", http.StatusBadRequest)
}

func handleGetRobotLog(w http.ResponseWriter, r *http.Request) {
	targetName := r.URL.Query().Get("target")
	if targetName == "" {
		http.Error(w, "'target' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	var target *DeployTarget
	for _, v := range deployTargets {
		if v.Name == targetName {
			target = v
			break
		}
	}
	if target == nil {
		http.Error(w, "no target by name "+targetName+" found", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	for line := range target.RobotLog {
		err = conn.WriteMessage(websocket.TextMessage, []byte(line))
		if err != nil {
			log.Println(err)
			return
		}
	}
}
