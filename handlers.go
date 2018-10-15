package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func handleLogin(w http.ResponseWriter, r *http.Request) {
	name := r.PostFormValue("name")
	if name == "" {
		http.Error(w, "'username' form value cannot be missing or empty", http.StatusBadRequest)
		return
	}

	_, err := users.Add(name)
	if err != nil {
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

	lesson, ok := lessons[lessonName]
	if !ok {
		http.Error(w, "no lesson by the name '"+lessonName+"' exists", http.StatusBadRequest)
		return
	}

	lesson.SaveCode(code)
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
	fmt.Fprint(w, job.ID.String())
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
