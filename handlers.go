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
		Name:     loginCookieName,
		Value:    name,
		Path:     "/",
		SameSite: http.SameSiteStrictMode,     // Mitigate CSRF on modern browsers
		Expires:  time.Now().AddDate(0, 1, 0), // One month from now
	})

	http.Redirect(w, r, "/", http.StatusTemporaryRedirect)
}

func handleGetUserLessons(w http.ResponseWriter, r *http.Request) {
	user, err := GetCurrentUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	lessons, err := user.LessonSlice()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(lessons)
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

	lesson, err := user.GetLesson(lessonName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
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

	lesson, err := user.GetLesson(lessonName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
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

	lesson, err := user.GetLesson(lessonName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
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
	defer writeMux.Unlock()

	err = conn.WriteMessage(websocket.TextMessage, []byte(job.ID.String()))
	if err != nil {
		return
	}

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
				close(job.CancelledSignal)
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
		err = conn.WriteMessage(websocket.TextMessage, []byte(line))
		if err != nil {
			break
		}
	}
}

func handleCancelDeploy(w http.ResponseWriter, r *http.Request) {
	targetName := r.FormValue("target")
	if targetName == "" {
		http.Error(w, "'target' form value cannot be missing or empty", http.StatusBadRequest)
		return
	}

	jobIDString := r.FormValue("jobid")
	if jobIDString == "" {
		http.Error(w, "'jobid' form value cannot be missing or empty", http.StatusBadRequest)
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
		log.Println(err)
		return
	}

	conn.SetReadDeadline(time.Now().Add(websocketReadTimeout))
	go func() {
		ticker := time.NewTicker(websocketReadTimeout / 4)
		for {
			<-ticker.C

			_, _, err = conn.ReadMessage()
			if err != nil {
				return
			}
			conn.SetReadDeadline(time.Now().Add(websocketReadTimeout))
		}
	}()

	output, cancel := target.GetLogChan()
	for line := range output {
		err = conn.WriteMessage(websocket.TextMessage, []byte(line))
		if err != nil {
			cancel <- true
			conn.Close()
			return
		}
	}
	cancel <- true
	conn.Close()
}
