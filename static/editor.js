'use strict';

const defaultOptions = {
  method: "GET",
  credentials: "same-origin"
};
const savingRate = 1500;
const RunStatusEnum = Object.freeze({"RUNNING": 1, "WAITING": 2, "STOPPED": 3});

var api;
var needsToSave = false;
var switchingTabs = false;
var runStatus = RunStatusEnum.STOPPED;
var currentLessonName = null;
var currentLessonElement = null;
var currentTargetName = "Dry Run"
var currentJobID = null;
var messagesSinceRun = 0;

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

    function saveCode() {
      if (!needsToSave || currentLessonName === null) return;

      if (currentLessonElement !== null)
        currentLessonElement.classList.remove("unsaved");

      // A " " looks the same as no form value to the server, so we make an empty editor into whitespace
      let code = editor.getValue();
      api.saveLessonCode(currentLessonName, code !== "" ? code : " ").catch(showErrorPopup);
      needsToSave = false;
    }

    // Now that the editor is loaded we'll start dealing with the API and UI
    let lessonContainer = document.querySelector("#lessons");
    let toggleRunButton = document.querySelector("#toggleRunButton");

    window.addEventListener("keypress", (event) => {
      if (event.ctrlKey && event.key === "s") {
        saveCode();
        event.preventDefault();
      }
    });
    let saveTimer = window.setInterval(saveCode, savingRate);
    editor.model.onDidChangeContent(() => {
      if (currentLessonName !== null) {
        needsToSave = true;

        clearInterval(saveTimer);
        saveTimer = window.setInterval(saveCode, savingRate);

        if (switchingTabs)
          switchingTabs = false;
        else if (currentLessonElement !== null)
          currentLessonElement.classList.add("unsaved");
      }
    });

    let baseURL = new URL(window.location.href);
    baseURL.pathname += "api/";
    api = new API(baseURL);

    api.getLessons().then(lessons => {
      lessons.forEach((lesson) => {
        let li = document.createElement("li");
        li.innerText = lesson.Name;
        li.classList.add("lesson");
        li.onclick = () => {
          if (currentLessonElement === li)
            return;

          saveCode();

          if (currentLessonElement !== null)
            currentLessonElement.classList.remove("selected");

          currentLessonName = lesson.Name;
          currentLessonElement = li;
          li.classList.add("selected");

          switchingTabs = true;
          setEditorCodeFromLesson(lesson.Name);
        };

        lessonContainer.appendChild(li);
      });
    }).catch(showErrorPopup);

    toggleRunButton.onclick = () => {
      messagesSinceRun = 0;
      if (runStatus !== RunStatusEnum.STOPPED) {
        runStatus = RunStatusEnum.STOPPED;
        toggleRunButton.innerText = "Run";
        toggleRunButton.className = "start";

        if (currentJobID !== null) {
          api.cancelDeploy(currentTargetName, currentJobID);
        }
      } else if (runStatus === RunStatusEnum.STOPPED) {
        if (currentLessonName === null) return;

        runStatus = RunStatusEnum.WAITING;
        toggleRunButton.innerText = "Waiting...";
        toggleRunButton.className = "waiting";

        api.getDeployQueue(currentTargetName).then((queueText) => {
          if (runStatus === RunStatusEnum.WAITING)
            toggleRunButton.innerText = "Waiting (" + queueText + ")...";
        });
        let socket = api.deploy(currentTargetName, currentLessonName);
        socket.onmessage = (messageEvent) => {
          messagesSinceRun++;
          if (messagesSinceRun > 1) {
            if (runStatus !== RunStatusEnum.WAITING)
              return;

            toggleRunButton.innerText = "Building and deploying...";
            console.log(messageEvent.data); // TODO
          } else {
            currentJobID = messageEvent.data;
          }
        };
        socket.onclose = () => {
          toggleRunButton.innerText = "Running...";
          toggleRunButton.className = "stop";
          runStatus = RunStatusEnum.RUNNING;
        };
      }
    };
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

  saveLessonCode(lessonName, code) {
    let url = new URL(this.baseURL);
    url.pathname += "lesson/save";

    let data = new FormData();
    data.append("lesson", lessonName);
    data.append("code", code);

    return fetch(url, {
      method: "POST",
      body: data,
      credentials: "same-origin"
    }).then(this.handle);
  }

  deploy(target, lessonName) {
    let url = new URL(this.baseURL);
    url.pathname += "lesson/deploy";
    url.searchParams.set("target", target);
    url.searchParams.set("lesson", lessonName);
    url.protocol = "ws:";

    return new WebSocket(url);
  }

  getDeployQueue(target) {
    let url = new URL(this.baseURL);
    url.pathname += "target/queue";
    url.searchParams.set("target", target);

    return fetch(url, defaultOptions).then(this.handle).then(this.toText);
  }

  cancelDeploy(target, jobID) {
    let url = new URL(this.baseURL);
    url.pathname += "lesson/deploy/cancel";
    url.searchParams.set("target", target);
    url.searchParams.set("jobid", jobID);

    return fetch(url, defaultOptions).then(this.handle);
  }

  handle(response) {
    let unreadResponse = response.clone();
    return response.text().then((bodyText) => {
      if (!response.ok) throw Error(response.statusText + ": " + bodyText);
      return unreadResponse;
    });
  }

  toJSON(response) {
    return response.json();
  }

  toText(response) {
    return response.text();
  }
}
