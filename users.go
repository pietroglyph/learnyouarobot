package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// User is a struct that holds a user's name and last active time
type User struct {
	Name          string
	LastActive    time.Time
	DataDirectory string

	// Lessons doesn't own this mutex because sometimes access to lessons doesn't need synchronization
	lessonsMux sync.Mutex
	// Populated on first call to GetLesson
	lessons Lessons
}

// Users is a strut that provides a set of thread-safe functions to manipulate
// logged-in users. You can also specifiy a maximum number of users.
type Users struct {
	MaxUsers int

	array []*User
	mux   sync.RWMutex
}

// GetUser returns a *User from a name, or returns an error if the user doesn't exist.
func (u *Users) GetUser(name string) (*User, error) {
	u.mux.RLock()
	defer u.mux.RUnlock()
	for _, user := range u.array {
		if user.Name == name {
			return user, nil
		}
	}
	return nil, fmt.Errorf("User %s doesn't exist", name)
}

// Add adds a user with a specific name. There can be no duplicate named users.
// The second return value is true and error is not nil if the user already exists.
// The second return value may be false while error is not nil.
func (u *Users) Add(name string) (*User, bool, error) {
	_, err := u.GetUser(name)
	if err == nil {
		return nil, true, fmt.Errorf("User %s already exists", name)
	}

	u.mux.Lock()
	defer u.mux.Unlock()
	if len(u.array) > u.MaxUsers {
		return nil, false, fmt.Errorf("The user limit of %d has been reached", u.MaxUsers)
	}
	user := &User{
		Name:       name,
		LastActive: time.Now(),
		lessons:    NewLessons(),
	}

	dataDir := filepath.Join(config.UserDataDirectory, name)
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		if err = os.MkdirAll(dataDir, os.ModePerm); err != nil {
			return nil, false, err
		}
	}
	user.DataDirectory = dataDir

	u.array = append(u.array, user)

	return user, false, nil
}

// NumUsers returns the number of loaded users
func (u *Users) NumUsers() int {
	u.mux.RLock()
	defer u.mux.RUnlock()
	return len(u.array)
}

// XXX: User has a lot of methods that might be able to only concern Lesson, if
// we do a bit of refactoring.

// GetLesson gets a user's lesson by name (not filename). It synchronizes and
// updates the underlying lessons map if needed.
func (u *User) GetLesson(name string) (*Lesson, error) {
	err := u.updateLessons()
	if err != nil {
		return nil, err
	}

	u.lessonsMux.Lock()
	defer u.lessonsMux.Unlock()
	for _, lesson := range u.lessons {
		if lesson.Name == name {
			return lesson, nil
		}
	}
	return nil, fmt.Errorf("Lesson %s doesn't exist", name)
}

// LessonSlice returns a new slice of the underlying user lessons array. This is
// needed along with Lesson.Slice() because this synchronizes and updates the
// underlying Lessons map.
func (u *User) LessonSlice() ([]*Lesson, error) {
	err := u.updateLessons()
	if err != nil {
		return nil, err
	}

	u.lessonsMux.Lock()
	defer u.lessonsMux.Unlock()
	return u.lessons.Slice(), nil
}

// lessons gets all the user's Lessons -- modified or not.
func (u *User) updateLessons() error {
	// Server must be restarted to read new lessons
	if len(u.lessons) > 0 {
		return nil
	}

	u.lessonsMux.Lock()
	defer u.lessonsMux.Unlock()

	for k, v := range stockLessons {
		newLesson := *v
		newLesson.Owner = u
		u.lessons[k] = &newLesson
	}

	userDir := filepath.Join(config.UserDataDirectory, u.Name)

	lessonFiles, err := ioutil.ReadDir(userDir)
	if err != nil {
		return err
	}

	for _, file := range lessonFiles {
		fileName := file.Name()
		lessonName := fileName
		alternateRobotPath := ""
		if sl, ok := stockLessons[fileName]; ok {
			lessonName = sl.Name
			alternateRobotPath = sl.AlternateRobotPath
		}

		lesson, err := NewLesson(lessonName, filepath.Join(userDir, fileName))
		if err != nil {
			return err
		}
		lesson.Modified = true
		lesson.Owner = u
		lesson.AlternateRobotPath = alternateRobotPath

		u.lessons[fileName] = lesson
	}

	// We return a copy of u.lessons, so we don't worry about data races on map access,
	// just data races on the underlying *Lesson.
	return nil
}

// GetCurrentUser gets the current user from an http request, or returns an error
// if no user is logged in or no user can be found by the name in the cookie.
func GetCurrentUser(r *http.Request) (*User, error) {
	cookie, err := r.Cookie(loginCookieName)
	if err != nil || cookie.Value == "" {
		return nil, fmt.Errorf("No login cookie found")
	}

	return users.GetUser(cookie.Value)
}
