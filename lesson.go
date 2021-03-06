package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// Lesson contains a lesson name, if it was modified, and its owner (which can be
// nil for stock lessons.)
type Lesson struct {
	Name     string
	Modified bool
	// Not included in JSON
	Owner              *User  `json:"-"`
	Path               string `json:"-"`
	AlternateRobotPath string `json:"-"`

	file *os.File
}

// Lessons contains a map of Lessons indexed by lesson names. The contained Lesson
// also contains a Name field, but we use a map/keep the duplicate data for easy of use.
type Lessons map[string]*Lesson

// NewLessons makes a new lesson map
func NewLessons() Lessons {
	return make(map[string]*Lesson)
}

// NewLesson makes a new lesson from a fileName and directory path. The user
// must set if the lesson has been modified or not!
func NewLesson(name string, path string) (*Lesson, error) {
	lesson := &Lesson{
		Name: name,
		Path: path,
		// Modified should be set by the user!
	}

	file, err := os.OpenFile(lesson.Path, os.O_RDWR, 0666)
	if err != nil {
		return &Lesson{}, err
	}

	lesson.file = file
	return lesson, nil
}

// Slice returns Lessons as []Lesson
func (l Lessons) Slice() []*Lesson {
	s := make([]*Lesson, len(l))

	i := 0
	for _, v := range l {
		s[i] = v
		i++
	}
	return s
}

// Reader returns a reader to read the contents of the lesson.
func (l *Lesson) Reader() io.Reader {
	l.file.Seek(0, 0)
	return l.file
}

// SaveCode overwrites the lesson file contents with the code argument.
func (l *Lesson) SaveCode(code string) error {
	if l.Owner == nil {
		return fmt.Errorf("Cannot save code for a lesson with a nil User pointer")
	}

	if l.Modified == false {
		_, filename := filepath.Split(l.Path)
		path := filepath.Join(l.Owner.DataDirectory, filename)
		newLessonFile, err := os.Create(path)
		if err != nil {
			return err
		}

		io.Copy(newLessonFile, l.file)
		l.file = newLessonFile
		l.Path = path
		l.Modified = true
	}

	// We fully overwrite the file contents
	err := l.file.Truncate(0)
	if err != nil {
		return err
	}
	_, err = l.file.Seek(0, 0)
	if err != nil {
		return err
	}

	_, err = l.file.Write([]byte(code))
	return err
}
