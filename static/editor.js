'use strict';

var api;
const defaultOptions = {
  method: "GET",
  credentials: "same-origin"
};

require.config({ paths: { "vs": "monaco-editor/min/vs" }});
require(["vs/editor/editor.main"], function() {
    var editor = monaco.editor.create(document.getElementById("editor"), {
        value: [
            "public class LearnYouARobot {",
            "\tpublic static void main(String[] args) {",
            "\t\tSystem.out.println(\"Welcome to Learn You a Robot! Select a lesson on the left to get started.\");",
            "\t}",
            "}"
        ].join("\n"),
        language: "java",
        theme: "vs-dark"
    });
    window.onresize = () => editor.layout();

    function showErrorPopup(error) {
      alert(error);
      console.error(error);
    }

    function setEditorCodeFromLesson(lessonName) {
      api.getLessonCode(lessonName).then(code => editor.setValue(code)).catch(showErrorPopup);
    }

    // Now that the editor's loaded we'll start dealing with the API and UI
    let lessonContainer = document.querySelector("#lessons");

    let baseURL = new URL(window.location.href);
    baseURL.pathname += "api/";
    api = new API(baseURL);

    api.getLessons().then(lessons => {
      lessons.forEach((lesson) => {
        let li = document.createElement("li");
        li.innerText = lesson.Name;
        li.classList.add("lesson");
        li.onclick = () => setEditorCodeFromLesson(lesson.Name);

        lessonContainer.appendChild(li);
      });
    }).catch(showErrorPopup);
});

class API {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  getLessons() {
    let url = new URL(this.baseURL);
    url.pathname += "user/lessons";

    return fetch(url, defaultOptions).then(this.handle).then(this.toJSON);
  }

  getLessonCode(lessonName) {
    let url = new URL(this.baseURL);
    url.pathname += "lesson/get";
    url.searchParams.set("lesson", lessonName);

    return fetch(url, defaultOptions).then(this.handle).then(this.toText);
  }

  setLessonCode(lessonName, code) {
    let url = new URL(this.baseURL);
    url.pathname += "lesson/save";

    let data = new FormData();
    data.append("lesson", lessonName);
    data.append("code", code);

    return fetch(url, {
      method: "POST",
      body: formData,
      credentials: "same-origin"
    }).then(this.handle);
  }

  deploy(target, lessonName) {
    let url = new URL(this.baseURL);
    url.pathname += "lesson/deploy";
    url.searchParams.set("target", target);
    url.searchParams.set("lesson", lessonName);

    return fetch(url, defaultOptions).then(this.handle);
  }

  getDeployQueue(target) {
    let url = new URL(this.baseURL);
    url.pathname += "lesson/deploy/queue";
    url.searchParams.set("target", target);

    return fetch(url, defaultOptions).then(this.handle).then(this.toJSON);
  }

  handle(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
  }

  toJSON(response) {
    return response.json();
  }

  toText(response) {
    return response.text();
  }
}
