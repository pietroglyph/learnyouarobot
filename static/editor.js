'use strict';

const defaultOptions = {
  method: "GET",
  credentials: "same-origin"
};
const savingRate = 1500;
const heartbeatSendRate = 1000;
const RunStatusEnum = Object.freeze({"RUNNING": 1, "WAITING": 2, "STOPPED": 3});

var api;

var needsToSave = false;
var switchingTabs = false;
var currentLessonName = null;
var currentLessonElement = null;

var currentTargetElement = null;
var currentTargetName = "Dry Run"
var currentJobID = null;
var runStatus = RunStatusEnum.STOPPED;
var messagesSinceRun = 0;
var currentSocket = null;
var currentHeartbeatTimer = null;

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

    // Now that the editor is loaded we'll start dealing with the API and UI
    let lessonContainer = document.querySelector("#lessons");
    let toggleRunButton = document.querySelector("#toggleRunButton");
    let targetContainer = document.querySelector("#deployTargets");
    let outputPopup = document.querySelector("#outputPopup");
    let outputWell = document.querySelector("#outputWell");

    // Set up the API class
    let baseURL = new URL(window.location.href);
    baseURL.pathname += "api/";
    api = new API(baseURL);

    // Save code when the user presses Ctrl+s
    window.addEventListener("keypress", (event) => {
      if (event.ctrlKey && event.key === "s") {
        saveCode();
        event.preventDefault();
      }
    });

    // Periodically save unsaved code
    let saveTimer = window.setInterval(saveCode, savingRate);
    editor.model.onDidChangeContent(() => {
      if (currentLessonName !== null) {
        needsToSave = true;

        window.clearInterval(saveTimer);
        saveTimer = window.setInterval(saveCode, savingRate);

        if (switchingTabs)
          switchingTabs = false;
        else if (currentLessonElement !== null)
          currentLessonElement.classList.add("unsaved");
      }
    });

    // Populate deploy targets pane, and set up switching behavior
    api.getDeployTargets().then(targets => {
      targets.forEach((target) => {
        let targetElement = document.createElement("li");
        targetElement.innerText = target.Name;
        if (target.Name === currentTargetName) {
          currentTargetElement = targetElement;
          targetElement.classList.add("selected");
        }

        targetElement.onclick = () => {
          if (currentTargetName !== null) currentTargetElement.classList.remove("selected");
          targetElement.classList.add("selected");
          currentTargetElement = targetElement;
          currentTargetName = target.Name;
        };

        targetContainer.appendChild(targetElement);
      });
    });

    // Populate lessons pane, and set up switching behavior
    api.getLessons().then(lessons => {
      lessons.forEach((lesson) => {
        let li = document.createElement("li");
        li.innerText = lesson.Name;
        li.classList.add("lesson");
        li.onclick = () => {
          toggleRunButton.disabled = false;
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

    // Start/cancel runs on button click, and associated behavior
    toggleRunButton.onclick = () => {
      messagesSinceRun = 0;
      if (runStatus !== RunStatusEnum.STOPPED) {
        resetRun();

        if (currentJobID !== null) {
          api.cancelDeploy(currentTargetName, currentJobID);
        }
      } else if (runStatus === RunStatusEnum.STOPPED) {
        if (currentLessonName === null) return;
        outputWell.innerText = "";

        runStatus = RunStatusEnum.WAITING;
        toggleRunButton.innerText = "Waiting...";
        toggleRunButton.className = "waiting";

        api.getDeployQueue(currentTargetName).then((queueText) => {
          if (runStatus === RunStatusEnum.WAITING)
            toggleRunButton.innerText = "Waiting (" + queueText + ")...";
        });

        currentSocket = api.deploy(currentTargetName, currentLessonName);
        currentHeartbeatTimer = window.setInterval(() => currentSocket.send(0x0), heartbeatSendRate);
        currentSocket.onmessage = (messageEvent) => {
          messagesSinceRun++;
          if (messagesSinceRun > 1) {
            toggleRunButton.innerText = "Running...";
            toggleRunButton.className = "stop";
            runStatus = RunStatusEnum.RUNNING;
            outputWell.innerText += messageEvent.data + "\n";
          } else {
            currentJobID = messageEvent.data;
            outputPopup.classList.remove("hidden");
          }
        };
        currentSocket.onclose = () => {
          resetRun();
        };
      }
    };

    // Open and close the output pane
    document.querySelector("#closeOutputButton").onclick = () => outputPopup.classList.add("hidden");
    document.querySelector("#openOutputButton").onclick = () => outputPopup.classList.remove("hidden");

    // Open and close the target switcher
    let toggleRobotSwitcher = () => switcherPopup.classList.toggle("hidden");
    document.querySelector("#switchRobotButton").onclick = toggleRobotSwitcher;
    document.querySelector("#closeSwitcherButton").onclick = toggleRobotSwitcher;

    // Reset state after a rune (heartbeat timer, websocket, and button)
    function resetRun() {
      runStatus = RunStatusEnum.STOPPED;
      toggleRunButton.innerText = "Run";
      toggleRunButton.className = "start";

      if (currentHeartbeatTimer !== null) window.clearInterval(currentHeartbeatTimer);
      if (currentSocket !== null) currentSocket.close()
    }

    // Present the user with an error popup
    function showErrorPopup(error) {
      alert(error);
      console.error(error);
    }

    // Set editor code from a lesson name and handle errors
    function setEditorCodeFromLesson(lessonName) {
      api.getLessonCode(lessonName).then(code => editor.setValue(code)).catch(showErrorPopup);
    }

    // Save code if a lesson is selected, and deal with an empty editor
    function saveCode() {
      if (!needsToSave || currentLessonName === null) return;

      if (currentLessonElement !== null)
        currentLessonElement.classList.remove("unsaved");

      // A " " looks the same as no form value to the server, so we make an empty editor into whitespace
      let code = editor.getValue();
      api.saveLessonCode(currentLessonName, code !== "" ? code : " ").catch(showErrorPopup);
      needsToSave = false;
    }
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
    url.pathname += "targets/queue";
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

  getDeployTargets() {
    let url = new URL(this.baseURL);
    url.pathname += "targets";

    return fetch(url, defaultOptions).then(this.handle).then(this.toJSON);
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
