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
		http.Error(w, "Missing username", http.StatusBadRequest)
		return
	}
	users.Add(name)
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

	lessonName := r.URL.Query().Get("name")
	if lessonName == "" {
		http.Error(w, "'name' query parameter cannot be missing or empty", http.StatusBadRequest)
		return
	}

	lessons, err := user.Lessons()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	io.Copy(w, lessons[lessonName].Reader())
}

func handleSaveLesson(w http.ResponseWriter, r *http.Request) {

}

func handleDeployLesson(w http.ResponseWriter, r *http.Request) {

}

func handleGetDeployQueue(w http.ResponseWriter, r *http.Request) {

}
