// import {
//   MonacoLanguageClient, CloseAction, ErrorAction,
//   MonacoServices, createConnection
// } from "monaco-languageclient"
import * as monaco from "monaco-editor"
import API from "./api"

const savingRate = 1500;
const heartbeatSendRate = 1000;
const RunStatusEnum = Object.freeze({ "RUNNING": 1, "WAITING": 2, "STOPPED": 3 });

var api: API;

var needsToSave = false;
var switchingTabs = false;
var currentLessonName: string | null = null;
var currentLessonElement: HTMLElement | null = null;

var currentTargetElement: HTMLElement | null = null;
var currentTargetName = "Dry Run"
var currentJobID: string | null = null;
var runStatus = RunStatusEnum.STOPPED;
var messagesSinceRun = 0;
var currentSocket: WebSocket | null = null;
var currentHeartbeatTimer: number | null = null;

document.addEventListener("DOMContentLoaded", () => {
  var editor = monaco.editor.create(safeQuerySelector("#editor"), {
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
  let lessonContainer = safeQuerySelector("#lessons");
  let toggleRunButton = safeQuerySelector("#toggleRunButton");
  let targetContainer = safeQuerySelector("#deployTargets");
  let switcherPopup = safeQuerySelector("#switcherPopup");
  let outputPopup = safeQuerySelector("#outputPopup");
  let outputWell = safeQuerySelector("#outputWell");

  // Set up the API class
  let baseURL = new URL(window.location.href);
  baseURL.pathname += "api/";
  api = new API(String(baseURL));

  // Save code when the user presses Ctrl+s
  window.addEventListener("keypress", (event) => {
    if (event.ctrlKey && event.key === "s") {
      saveCode();
      event.preventDefault();
    }
  });

  // Periodically save unsaved code
  let saveTimer = window.setInterval(saveCode, savingRate);
  editor.getModel().onDidChangeContent(() => {
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
    targets.forEach((target: { Name: string, Address: string }) => {
      let targetElement = document.createElement("li");
      targetElement.innerText = target.Name;
      if (target.Name === currentTargetName) {
        currentTargetElement = targetElement;
        targetElement.classList.add("selected");
      }

      targetElement.onclick = () => {
        if (currentTargetName !== null) throwOnNull(currentTargetElement).classList.remove("selected");
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
        toggleRunButton.attributes.removeNamedItem("disabled");
        if (currentLessonElement === li)
          return;

        saveCode();

        if (currentLessonElement !== null)
          currentLessonElement.classList.remove("selected");

        currentLessonName = String(lesson.Name);
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
      currentHeartbeatTimer = window.setInterval(() => {
        if (currentSocket !== null) currentSocket.send("h")
      }, heartbeatSendRate);
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
  safeQuerySelector("#closeOutputButton").onclick = () => outputPopup.classList.add("hidden");
  safeQuerySelector("#openOutputButton").onclick = () => outputPopup.classList.remove("hidden");

  // Open and close the target switcher
  let toggleRobotSwitcher = () => switcherPopup.classList.toggle("hidden");
  safeQuerySelector("#switchRobotButton").onclick = toggleRobotSwitcher;
  safeQuerySelector("#closeSwitcherButton").onclick = toggleRobotSwitcher;

  // Reset state after a run (heartbeat timer, websocket, and button)
  function resetRun() {
    runStatus = RunStatusEnum.STOPPED;
    toggleRunButton.innerText = "Run";
    toggleRunButton.className = "start";

    if (currentHeartbeatTimer !== null) window.clearInterval(currentHeartbeatTimer);
    if (currentSocket !== null) currentSocket.close()
  }

  function showErrorPopup(error: Error) {
    alert(error);
    console.error(error);
  }

  // Set editor code from a lesson name and handle errors
  function setEditorCodeFromLesson(lessonName: string) {
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

  function safeQuerySelector(selector: string): HTMLElement {
    return throwOnNull(document.querySelector(selector));
  }

  function throwOnNull<T>(something: T | null): T {
    if (something === null) {
      throw new Error(String(something) + " cannot be null.")
    }
    return something
  }
});