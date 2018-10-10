'use strict';

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
});
