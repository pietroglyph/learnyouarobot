const defaultOptions = {
    method: "GET",
    credentials: "same-origin" as RequestCredentials
};
const heartbeatSendRate = 1000;

export default class API {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    getLessons(): Promise<{ Name: string, Modified: string, Path: string }[]> {
        let url = new URL(this.baseURL);
        url.pathname += "user/lessons";

        return fetch(String(url), defaultOptions).then(this.handle).then(this.toJSON);
    }

    getLessonCode(lessonName: string): Promise<string> {
        let url = new URL(this.baseURL);
        url.pathname += "lesson/get";
        url.searchParams.set("lesson", lessonName);

        return fetch(String(url), defaultOptions).then(this.handle).then(this.toText);
    }

    saveLessonCode(lessonName: string, code: string): Promise<Response> {
        let url = new URL(this.baseURL);
        url.pathname += "lesson/save";

        let data = new FormData();
        data.append("lesson", lessonName);
        data.append("code", code);

        return fetch(String(url), {
            method: "POST",
            body: data,
            credentials: "same-origin"
        }).then(this.handle);
    }

    deploy(target: string, lessonName: string): HeartbeatingWebSocket {
        let url = new URL(this.baseURL);
        url.pathname += "lesson/deploy";
        url.searchParams.set("target", target);
        url.searchParams.set("lesson", lessonName);
        url.protocol = "ws:";

        return new HeartbeatingWebSocket(String(url));
    }

    getDeployQueue(target: string): Promise<string> {
        let url = new URL(this.baseURL);
        url.pathname += "targets/queue";
        url.searchParams.set("target", target);

        return fetch(String(url), defaultOptions).then(this.handle).then(this.toText);
    }

    cancelDeploy(target: string, jobID: string): Promise<Response> {
        let url = new URL(this.baseURL);
        url.pathname += "lesson/deploy/cancel";
        url.searchParams.set("target", target);
        url.searchParams.set("jobid", jobID);

        return fetch(String(url), defaultOptions).then(this.handle);
    }

    getDeployTargets(): Promise<{ Name: string, Address: string }[]> {
        let url = new URL(this.baseURL);
        url.pathname += "targets";

        return fetch(String(url), defaultOptions).then(this.handle).then(this.toJSON);
    }

    getLogWebsocket(target: string) {
        let url = new URL(this.baseURL);
        url.pathname += "targets/robotlog";
        url.searchParams.set("target", target);
        url.protocol = "ws:";

        return new HeartbeatingWebSocket(String(url));
    }

    handle(response: Response): Promise<Response> {
        let unreadResponse = response.clone();
        return response.text().then((bodyText) => {
            if (!response.ok) throw Error(response.statusText + ": " + bodyText);
            return unreadResponse;
        });
    }

    toJSON(response: Response): Promise<any> {
        return response.json();
    }

    toText(response: Response): Promise<string> {
        return response.text();
    }
}

export class HeartbeatingWebSocket extends WebSocket {
    private heartbeatTimer: number;

    constructor(url: string, protocols?: string | string[] | undefined) {
        super(url, protocols);
        this.heartbeatTimer = window.setInterval(() => this.send("h"), heartbeatSendRate);
    }

    close(code?: number | undefined, reason?: string | undefined): void {
        window.clearInterval(this.heartbeatTimer);
        super.close(code, reason);
    }
}
