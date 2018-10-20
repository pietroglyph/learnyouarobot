var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define("services", ["require", "exports", "vscode-languageserver-protocol/lib/main", "vscode-jsonrpc", "vscode-languageserver-protocol/lib/main"], function (require, exports, main_1, vscode_jsonrpc_1, main_2) {
    /* --------------------------------------------------------------------------------------------
     * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
     * Licensed under the MIT License. See License.txt in the project root for license information.
     * ------------------------------------------------------------------------------------------ */
    'use strict';
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Disposable = vscode_jsonrpc_1.Disposable;
    exports.CancellationToken = vscode_jsonrpc_1.CancellationToken;
    exports.Event = vscode_jsonrpc_1.Event;
    exports.Emitter = vscode_jsonrpc_1.Emitter;
    __export(main_2);
    var Services;
    (function (Services) {
        const global = window;
        const symbol = Symbol('Services');
        Services.get = () => {
            const services = global[symbol];
            if (!services) {
                throw new Error('Language Client services has not been installed');
            }
            return services;
        };
        function install(services) {
            if (global[symbol]) {
                console.error(new Error('Language Client services has been overriden'));
            }
            global[symbol] = services;
        }
        Services.install = install;
    })(Services = exports.Services || (exports.Services = {}));
    function isDocumentSelector(selector) {
        if (!selector || !Array.isArray(selector)) {
            return false;
        }
        return selector.every(value => typeof value === 'string' || main_1.DocumentFilter.is(value));
    }
    exports.isDocumentSelector = isDocumentSelector;
    var DocumentIdentifier;
    (function (DocumentIdentifier) {
        function is(arg) {
            return !!arg && ('uri' in arg) && ('languageId' in arg);
        }
        DocumentIdentifier.is = is;
    })(DocumentIdentifier = exports.DocumentIdentifier || (exports.DocumentIdentifier = {}));
    var ConfigurationTarget;
    (function (ConfigurationTarget) {
        ConfigurationTarget[ConfigurationTarget["Global"] = 1] = "Global";
        ConfigurationTarget[ConfigurationTarget["Workspace"] = 2] = "Workspace";
        ConfigurationTarget[ConfigurationTarget["WorkspaceFolder"] = 3] = "WorkspaceFolder";
    })(ConfigurationTarget = exports.ConfigurationTarget || (exports.ConfigurationTarget = {}));
});
define("connection", ["require", "exports", "vscode-languageserver-protocol/lib/main", "vscode-languageserver-protocol/lib/utils/is"], function (require, exports, main_3, Is) {
    /* --------------------------------------------------------------------------------------------
     * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
     * Licensed under the MIT License. See License.txt in the project root for license information.
     * ------------------------------------------------------------------------------------------ */
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    function createConnection(connection, errorHandler, closeHandler) {
        connection.onError((data) => { errorHandler(data[0], data[1], data[2]); });
        connection.onClose(closeHandler);
        return {
            listen: () => connection.listen(),
            sendRequest: (type, ...params) => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
            onRequest: (type, handler) => connection.onRequest(Is.string(type) ? type : type.method, handler),
            sendNotification: (type, params) => connection.sendNotification(Is.string(type) ? type : type.method, params),
            onNotification: (type, handler) => connection.onNotification(Is.string(type) ? type : type.method, handler),
            trace: (value, tracer, sendNotification = false) => connection.trace(value, tracer, sendNotification),
            initialize: (params) => connection.sendRequest(main_3.InitializeRequest.type, params),
            shutdown: () => connection.sendRequest(main_3.ShutdownRequest.type, undefined),
            exit: () => connection.sendNotification(main_3.ExitNotification.type),
            onLogMessage: (handler) => connection.onNotification(main_3.LogMessageNotification.type, handler),
            onShowMessage: (handler) => connection.onNotification(main_3.ShowMessageNotification.type, handler),
            onTelemetry: (handler) => connection.onNotification(main_3.TelemetryEventNotification.type, handler),
            didChangeConfiguration: (params) => connection.sendNotification(main_3.DidChangeConfigurationNotification.type, params),
            didChangeWatchedFiles: (params) => connection.sendNotification(main_3.DidChangeWatchedFilesNotification.type, params),
            didOpenTextDocument: (params) => connection.sendNotification(main_3.DidOpenTextDocumentNotification.type, params),
            didChangeTextDocument: (params) => connection.sendNotification(main_3.DidChangeTextDocumentNotification.type, params),
            didCloseTextDocument: (params) => connection.sendNotification(main_3.DidCloseTextDocumentNotification.type, params),
            didSaveTextDocument: (params) => connection.sendNotification(main_3.DidSaveTextDocumentNotification.type, params),
            onDiagnostics: (handler) => connection.onNotification(main_3.PublishDiagnosticsNotification.type, handler),
            dispose: () => connection.dispose()
        };
    }
    exports.createConnection = createConnection;
});
define("console-window", ["require", "exports", "services"], function (require, exports, services_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class ConsoleWindow {
        constructor() {
            this.channels = new Map();
        }
        showMessage(type, message, ...actions) {
            if (type === services_1.MessageType.Error) {
                console.error(message);
            }
            if (type === services_1.MessageType.Warning) {
                console.warn(message);
            }
            if (type === services_1.MessageType.Info) {
                console.info(message);
            }
            if (type === services_1.MessageType.Log) {
                console.log(message);
            }
            return Promise.resolve(undefined);
        }
        createOutputChannel(name) {
            const existing = this.channels.get(name);
            if (existing) {
                return existing;
            }
            const channel = {
                append(value) {
                    console.log(name + ': ' + value);
                },
                appendLine(line) {
                    console.log(name + ': ' + line);
                },
                show() {
                    // no-op
                },
                dispose() {
                    // no-op
                }
            };
            this.channels.set(name, channel);
            return channel;
        }
    }
    exports.ConsoleWindow = ConsoleWindow;
});
define("disposable", ["require", "exports", "services"], function (require, exports, services_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Disposable = services_2.Disposable;
    class DisposableCollection {
        constructor() {
            this.disposables = [];
        }
        dispose() {
            while (this.disposables.length !== 0) {
                this.disposables.pop().dispose();
            }
        }
        push(disposable) {
            const disposables = this.disposables;
            disposables.push(disposable);
            return {
                dispose() {
                    const index = disposables.indexOf(disposable);
                    if (index !== -1) {
                        disposables.splice(index, 1);
                    }
                }
            };
        }
    }
    exports.DisposableCollection = DisposableCollection;
});
define("monaco-language-client", ["require", "exports", "vscode-base-languageclient/lib/client", "vscode-base-languageclient/lib/typeDefinition", "vscode-base-languageclient/lib/implementation", "vscode-base-languageclient/lib/colorProvider", "vscode-base-languageclient/lib/workspaceFolders", "vscode-base-languageclient/lib/foldingRange", "vscode-base-languageclient/lib/client"], function (require, exports, client_1, typeDefinition_1, implementation_1, colorProvider_1, workspaceFolders_1, foldingRange_1, client_2) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export(client_2);
    class MonacoLanguageClient extends client_1.BaseLanguageClient {
        constructor({ id, name, clientOptions, connectionProvider }) {
            super(id || name.toLowerCase(), name, clientOptions);
            this.connectionProvider = connectionProvider;
            this.createConnection = this.doCreateConnection.bind(this);
            // bypass LSP <=> VS Code conversion
            const self = this;
            self._p2c = new Proxy(self._p2c, {
                get: (target, prop) => {
                    if (prop === 'asUri') {
                        return target[prop];
                    }
                    return MonacoLanguageClient.bypassConversion;
                }
            });
            self._c2p = new Proxy(self._c2p, {
                get: (target, prop) => {
                    if (prop === 'asUri') {
                        return target[prop];
                    }
                    if (prop === 'asCompletionParams') {
                        return (textDocument, position, context) => {
                            return {
                                textDocument: target.asTextDocumentIdentifier(textDocument),
                                position,
                                context
                            };
                        };
                    }
                    if (prop === 'asWillSaveTextDocumentParams') {
                        return (event) => {
                            return {
                                textDocument: target.asTextDocumentIdentifier(event.document),
                                reason: event.reason
                            };
                        };
                    }
                    if (prop.endsWith('Params')) {
                        return target[prop];
                    }
                    return MonacoLanguageClient.bypassConversion;
                }
            });
        }
        doCreateConnection() {
            const errorHandler = this.handleConnectionError.bind(this);
            const closeHandler = this.handleConnectionClosed.bind(this);
            return this.connectionProvider.get(errorHandler, closeHandler, this.outputChannel);
        }
        createMessageTransports(encoding) {
            throw new Error('Unsupported');
        }
        registerBuiltinFeatures() {
            super.registerBuiltinFeatures();
            this.registerFeature(new typeDefinition_1.TypeDefinitionFeature(this));
            this.registerFeature(new implementation_1.ImplementationFeature(this));
            this.registerFeature(new colorProvider_1.ColorProviderFeature(this));
            this.registerFeature(new workspaceFolders_1.WorkspaceFoldersFeature(this));
            const foldingRangeFeature = new foldingRange_1.FoldingRangeFeature(this);
            foldingRangeFeature['asFoldingRanges'] = MonacoLanguageClient.bypassConversion;
            this.registerFeature(foldingRangeFeature);
        }
    }
    MonacoLanguageClient.bypassConversion = (result) => result || undefined;
    exports.MonacoLanguageClient = MonacoLanguageClient;
});
define("monaco-commands", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class MonacoCommands {
        constructor(editor) {
            this.editor = editor;
        }
        registerCommand(command, callback, thisArg) {
            return this.editor._commandService.addCommand({
                id: command,
                handler: (_accessor, ...args) => callback(...args)
            });
        }
    }
    exports.MonacoCommands = MonacoCommands;
});
define("monaco-converter", ["require", "exports", "vscode-languageserver-protocol/lib/utils/is", "services"], function (require, exports, Is, services_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ProtocolDocumentLink;
    (function (ProtocolDocumentLink) {
        function is(item) {
            return !!item && 'data' in item;
        }
        ProtocolDocumentLink.is = is;
    })(ProtocolDocumentLink = exports.ProtocolDocumentLink || (exports.ProtocolDocumentLink = {}));
    var ProtocolCodeLens;
    (function (ProtocolCodeLens) {
        function is(item) {
            return !!item && 'data' in item;
        }
        ProtocolCodeLens.is = is;
    })(ProtocolCodeLens = exports.ProtocolCodeLens || (exports.ProtocolCodeLens = {}));
    var ProtocolCompletionItem;
    (function (ProtocolCompletionItem) {
        function is(item) {
            return !!item && 'data' in item;
        }
        ProtocolCompletionItem.is = is;
    })(ProtocolCompletionItem = exports.ProtocolCompletionItem || (exports.ProtocolCompletionItem = {}));
    class MonacoToProtocolConverter {
        asPosition(lineNumber, column) {
            const line = lineNumber === undefined || lineNumber === null ? undefined : lineNumber - 1;
            const character = column === undefined || column === null ? undefined : column - 1;
            return {
                line, character
            };
        }
        asRange(range) {
            if (range === undefined) {
                return undefined;
            }
            if (range === null) {
                return null;
            }
            const start = this.asPosition(range.startLineNumber, range.startColumn);
            const end = this.asPosition(range.endLineNumber, range.endColumn);
            return {
                start, end
            };
        }
        asTextDocumentIdentifier(model) {
            return {
                uri: model.uri.toString()
            };
        }
        asTextDocumentPositionParams(model, position) {
            return {
                textDocument: this.asTextDocumentIdentifier(model),
                position: this.asPosition(position.lineNumber, position.column)
            };
        }
        asCompletionParams(model, position, context) {
            return Object.assign(this.asTextDocumentPositionParams(model, position), {
                context: this.asCompletionContext(context)
            });
        }
        asCompletionContext(context) {
            return {
                triggerKind: this.asTriggerKind(context.triggerKind),
                triggerCharacter: context.triggerCharacter
            };
        }
        asTriggerKind(triggerKind) {
            switch (triggerKind) {
                case monaco.languages.SuggestTriggerKind.TriggerCharacter:
                    return services_3.CompletionTriggerKind.TriggerCharacter;
                case monaco.languages.SuggestTriggerKind.TriggerForIncompleteCompletions:
                    return services_3.CompletionTriggerKind.TriggerForIncompleteCompletions;
                default:
                    return services_3.CompletionTriggerKind.Invoked;
            }
        }
        asCompletionItem(item) {
            const result = { label: item.label };
            const protocolItem = ProtocolCompletionItem.is(item) ? item : undefined;
            if (item.detail) {
                result.detail = item.detail;
            }
            // We only send items back we created. So this can't be something else than
            // a string right now.
            if (item.documentation) {
                if (!protocolItem || !protocolItem.documentationFormat) {
                    result.documentation = item.documentation;
                }
                else {
                    result.documentation = this.asDocumentation(protocolItem.documentationFormat, item.documentation);
                }
            }
            if (item.filterText) {
                result.filterText = item.filterText;
            }
            this.fillPrimaryInsertText(result, item);
            if (Is.number(item.kind)) {
                result.kind = this.asCompletionItemKind(item.kind, protocolItem && protocolItem.originalItemKind);
            }
            if (item.sortText) {
                result.sortText = item.sortText;
            }
            if (item.additionalTextEdits) {
                result.additionalTextEdits = this.asTextEdits(item.additionalTextEdits);
            }
            if (item.command) {
                result.command = this.asCommand(item.command);
            }
            if (item.commitCharacters) {
                result.commitCharacters = item.commitCharacters.slice();
            }
            if (item.command) {
                result.command = this.asCommand(item.command);
            }
            // TODO if (item.preselect === true || item.preselect === false) { result.preselect = item.preselect; }
            if (protocolItem) {
                if (protocolItem.data !== undefined) {
                    result.data = protocolItem.data;
                }
                if (protocolItem.deprecated === true || protocolItem.deprecated === false) {
                    result.deprecated = protocolItem.deprecated;
                }
            }
            return result;
        }
        asCompletionItemKind(value, original) {
            if (original !== undefined) {
                return original;
            }
            return value + 1;
        }
        asDocumentation(format, documentation) {
            switch (format) {
                case services_3.MarkupKind.PlainText:
                    return { kind: format, value: documentation };
                case services_3.MarkupKind.Markdown:
                    return { kind: format, value: documentation.value };
                default:
                    return `Unsupported Markup content received. Kind is: ${format}`;
            }
        }
        fillPrimaryInsertText(target, source) {
            let format = services_3.InsertTextFormat.PlainText;
            let text;
            let range;
            if (source.textEdit) {
                text = source.textEdit.text;
                range = this.asRange(source.textEdit.range);
            }
            else if (typeof source.insertText === 'string') {
                text = source.insertText;
            }
            else if (source.insertText) {
                format = services_3.InsertTextFormat.Snippet;
                text = source.insertText.value;
            }
            if (source.range) {
                range = this.asRange(source.range);
            }
            target.insertTextFormat = format;
            if (source.fromEdit && text && range) {
                target.textEdit = { newText: text, range: range };
            }
            else {
                target.insertText = text;
            }
        }
        asTextEdit(edit) {
            const range = this.asRange(edit.range);
            return {
                range,
                newText: edit.text
            };
        }
        asTextEdits(items) {
            if (!items) {
                return undefined;
            }
            return items.map(item => this.asTextEdit(item));
        }
        asReferenceParams(model, position, options) {
            return {
                textDocument: this.asTextDocumentIdentifier(model),
                position: this.asPosition(position.lineNumber, position.column),
                context: { includeDeclaration: options.includeDeclaration }
            };
        }
        asDocumentSymbolParams(model) {
            return {
                textDocument: this.asTextDocumentIdentifier(model)
            };
        }
        asCodeLensParams(model) {
            return {
                textDocument: this.asTextDocumentIdentifier(model)
            };
        }
        asDiagnosticSeverity(value) {
            switch (value) {
                case monaco.MarkerSeverity.Error:
                    return services_3.DiagnosticSeverity.Error;
                case monaco.MarkerSeverity.Warning:
                    return services_3.DiagnosticSeverity.Warning;
                case monaco.MarkerSeverity.Info:
                    return services_3.DiagnosticSeverity.Information;
                case monaco.MarkerSeverity.Hint:
                    return services_3.DiagnosticSeverity.Hint;
            }
            return undefined;
        }
        asDiagnostic(marker) {
            const range = this.asRange(new monaco.Range(marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn));
            const severity = this.asDiagnosticSeverity(marker.severity);
            return services_3.Diagnostic.create(range, marker.message, severity, marker.code, marker.source);
        }
        asDiagnostics(markers) {
            if (markers === void 0 || markers === null) {
                return markers;
            }
            return markers.map(marker => this.asDiagnostic(marker));
        }
        asCodeActionContext(context) {
            if (context === void 0 || context === null) {
                return context;
            }
            const diagnostics = this.asDiagnostics(context.markers);
            return services_3.CodeActionContext.create(diagnostics, Is.string(context.only) ? [context.only] : undefined);
        }
        asCodeActionParams(model, range, context) {
            return {
                textDocument: this.asTextDocumentIdentifier(model),
                range: this.asRange(range),
                context: this.asCodeActionContext(context)
            };
        }
        asCommand(item) {
            if (item) {
                let args = item.arguments || [];
                return services_3.Command.create(item.title, item.id, ...args);
            }
            return undefined;
        }
        asCodeLens(item) {
            let result = services_3.CodeLens.create(this.asRange(item.range));
            if (item.command) {
                result.command = this.asCommand(item.command);
            }
            if (ProtocolCodeLens.is(item)) {
                if (item.data) {
                    result.data = item.data;
                }
                ;
            }
            return result;
        }
        asFormattingOptions(options) {
            return { tabSize: options.tabSize, insertSpaces: options.insertSpaces };
        }
        asDocumentFormattingParams(model, options) {
            return {
                textDocument: this.asTextDocumentIdentifier(model),
                options: this.asFormattingOptions(options)
            };
        }
        asDocumentRangeFormattingParams(model, range, options) {
            return {
                textDocument: this.asTextDocumentIdentifier(model),
                range: this.asRange(range),
                options: this.asFormattingOptions(options)
            };
        }
        asDocumentOnTypeFormattingParams(model, position, ch, options) {
            return {
                textDocument: this.asTextDocumentIdentifier(model),
                position: this.asPosition(position.lineNumber, position.column),
                ch,
                options: this.asFormattingOptions(options)
            };
        }
        asRenameParams(model, position, newName) {
            return {
                textDocument: this.asTextDocumentIdentifier(model),
                position: this.asPosition(position.lineNumber, position.column),
                newName
            };
        }
        asDocumentLinkParams(model) {
            return {
                textDocument: this.asTextDocumentIdentifier(model)
            };
        }
        asDocumentLink(item) {
            let result = services_3.DocumentLink.create(this.asRange(item.range));
            if (item.url) {
                result.target = item.url;
            }
            if (ProtocolDocumentLink.is(item) && item.data) {
                result.data = item.data;
            }
            return result;
        }
    }
    exports.MonacoToProtocolConverter = MonacoToProtocolConverter;
    class ProtocolToMonacoConverter {
        asResourceEdits(resource, edits, modelVersionId) {
            return {
                resource: resource,
                edits: this.asTextEdits(edits),
                modelVersionId
            };
        }
        asWorkspaceEdit(item) {
            if (!item) {
                return undefined;
            }
            const edits = [];
            if (item.documentChanges) {
                for (const change of item.documentChanges) {
                    const resource = monaco.Uri.parse(change.textDocument.uri);
                    const version = typeof change.textDocument.version === 'number' ? change.textDocument.version : undefined;
                    edits.push(this.asResourceEdits(resource, change.edits, version));
                }
            }
            else if (item.changes) {
                for (const key of Object.keys(item.changes)) {
                    const resource = monaco.Uri.parse(key);
                    edits.push(this.asResourceEdits(resource, item.changes[key]));
                }
            }
            return {
                edits
            };
        }
        asTextEdit(edit) {
            if (!edit) {
                return undefined;
            }
            const range = this.asRange(edit.range);
            return {
                range,
                text: edit.newText
            };
        }
        asTextEdits(items) {
            if (!items) {
                return undefined;
            }
            return items.map(item => this.asTextEdit(item));
        }
        asCodeLens(item) {
            if (!item) {
                return undefined;
            }
            const range = this.asRange(item.range);
            let result = { range };
            if (item.command) {
                result.command = this.asCommand(item.command);
            }
            if (item.data !== void 0 && item.data !== null) {
                result.data = item.data;
            }
            return result;
        }
        asCodeLenses(items) {
            if (!items) {
                return undefined;
            }
            return items.map((codeLens) => this.asCodeLens(codeLens));
        }
        asCodeActions(actions) {
            return actions.map(action => this.asCodeAction(action));
        }
        asCodeAction(item) {
            if (services_3.CodeAction.is(item)) {
                return {
                    title: item.title,
                    command: this.asCommand(item.command),
                    edit: this.asWorkspaceEdit(item.edit),
                    diagnostics: this.asDiagnostics(item.diagnostics),
                    kind: item.kind
                };
            }
            return {
                command: {
                    id: item.command,
                    title: item.title,
                    arguments: item.arguments
                },
                title: item.title
            };
        }
        asCommand(command) {
            if (!command) {
                return undefined;
            }
            return {
                id: command.command,
                title: command.title,
                arguments: command.arguments
            };
        }
        asDocumentSymbol(value) {
            const children = value.children && value.children.map(c => this.asDocumentSymbol(c));
            return {
                name: value.name,
                detail: value.detail || "",
                kind: this.asSymbolKind(value.kind),
                range: this.asRange(value.range),
                selectionRange: this.asRange(value.selectionRange),
                children
            };
        }
        asDocumentSymbols(values) {
            if (services_3.DocumentSymbol.is(values[0])) {
                return values.map(s => this.asDocumentSymbol(s));
            }
            return this.asSymbolInformations(values);
        }
        asSymbolInformations(values, uri) {
            if (!values) {
                return undefined;
            }
            return values.map(information => this.asSymbolInformation(information, uri));
        }
        asSymbolInformation(item, uri) {
            const location = this.asLocation(uri ? Object.assign({}, item.location, { uri: uri.toString() }) : item.location);
            return {
                name: item.name,
                detail: '',
                containerName: item.containerName,
                kind: this.asSymbolKind(item.kind),
                range: location.range,
                selectionRange: location.range
            };
        }
        asSymbolKind(item) {
            if (item <= services_3.SymbolKind.TypeParameter) {
                // Symbol kind is one based in the protocol and zero based in code.
                return item - 1;
            }
            return monaco.languages.SymbolKind.Property;
        }
        asDocumentHighlights(values) {
            if (!values) {
                return undefined;
            }
            return values.map(item => this.asDocumentHighlight(item));
        }
        asDocumentHighlight(item) {
            const range = this.asRange(item.range);
            const kind = Is.number(item.kind) ? this.asDocumentHighlightKind(item.kind) : undefined;
            return { range, kind };
        }
        asDocumentHighlightKind(item) {
            switch (item) {
                case services_3.DocumentHighlightKind.Text:
                    return monaco.languages.DocumentHighlightKind.Text;
                case services_3.DocumentHighlightKind.Read:
                    return monaco.languages.DocumentHighlightKind.Read;
                case services_3.DocumentHighlightKind.Write:
                    return monaco.languages.DocumentHighlightKind.Write;
            }
            return monaco.languages.DocumentHighlightKind.Text;
        }
        asReferences(values) {
            if (!values) {
                return undefined;
            }
            return values.map(location => this.asLocation(location));
        }
        asDefinitionResult(item) {
            if (!item) {
                return undefined;
            }
            if (Is.array(item)) {
                return item.map((location) => this.asLocation(location));
            }
            else {
                return this.asLocation(item);
            }
        }
        asLocation(item) {
            if (!item) {
                return undefined;
            }
            const uri = monaco.Uri.parse(item.uri);
            const range = this.asRange(item.range);
            return {
                uri, range
            };
        }
        asSignatureHelp(item) {
            if (!item) {
                return undefined;
            }
            let result = {};
            if (Is.number(item.activeSignature)) {
                result.activeSignature = item.activeSignature;
            }
            else {
                // activeSignature was optional in the past
                result.activeSignature = 0;
            }
            if (Is.number(item.activeParameter)) {
                result.activeParameter = item.activeParameter;
            }
            else {
                // activeParameter was optional in the past
                result.activeParameter = 0;
            }
            if (item.signatures) {
                result.signatures = this.asSignatureInformations(item.signatures);
            }
            else {
                result.signatures = [];
            }
            return result;
        }
        asSignatureInformations(items) {
            return items.map(item => this.asSignatureInformation(item));
        }
        asSignatureInformation(item) {
            let result = { label: item.label };
            if (item.documentation) {
                result.documentation = this.asDocumentation(item.documentation);
            }
            if (item.parameters) {
                result.parameters = this.asParameterInformations(item.parameters);
            }
            else {
                result.parameters = [];
            }
            return result;
        }
        asParameterInformations(item) {
            return item.map(item => this.asParameterInformation(item));
        }
        asParameterInformation(item) {
            let result = { label: item.label };
            if (item.documentation) {
                result.documentation = this.asDocumentation(item.documentation);
            }
            ;
            return result;
        }
        asHover(hover) {
            if (!hover) {
                return undefined;
            }
            return {
                contents: this.asHoverContent(hover.contents),
                range: this.asRange(hover.range)
            };
        }
        asHoverContent(contents) {
            if (Array.isArray(contents)) {
                return contents.map(content => this.asMarkdownString(content));
            }
            return [this.asMarkdownString(contents)];
        }
        asDocumentation(value) {
            if (Is.string(value)) {
                return value;
            }
            if (value.kind === services_3.MarkupKind.PlainText) {
                return value.value;
            }
            return this.asMarkdownString(value);
        }
        asMarkdownString(content) {
            if (services_3.MarkupContent.is(content)) {
                return {
                    value: content.value
                };
            }
            if (Is.string(content)) {
                return { value: content };
            }
            const { language, value } = content;
            return {
                value: '```' + language + '\n' + value + '\n```'
            };
        }
        asSeverity(severity) {
            if (severity === 1) {
                return monaco.MarkerSeverity.Error;
            }
            if (severity === 2) {
                return monaco.MarkerSeverity.Warning;
            }
            if (severity === 3) {
                return monaco.MarkerSeverity.Info;
            }
            return monaco.MarkerSeverity.Hint;
        }
        asDiagnostics(diagnostics) {
            if (!diagnostics) {
                return undefined;
            }
            return diagnostics.map(diagnostic => this.asDiagnostic(diagnostic));
        }
        asDiagnostic(diagnostic) {
            return {
                code: typeof diagnostic.code === "number" ? diagnostic.code.toString() : diagnostic.code,
                severity: this.asSeverity(diagnostic.severity),
                message: diagnostic.message,
                source: diagnostic.source,
                startLineNumber: diagnostic.range.start.line + 1,
                startColumn: diagnostic.range.start.character + 1,
                endLineNumber: diagnostic.range.end.line + 1,
                endColumn: diagnostic.range.end.character + 1,
                relatedInformation: this.asRelatedInformations(diagnostic.relatedInformation)
            };
        }
        asRelatedInformations(relatedInformation) {
            if (!relatedInformation) {
                return undefined;
            }
            return relatedInformation.map(item => this.asRelatedInformation(item));
        }
        asRelatedInformation(relatedInformation) {
            return {
                resource: monaco.Uri.parse(relatedInformation.location.uri),
                startLineNumber: relatedInformation.location.range.start.line + 1,
                startColumn: relatedInformation.location.range.start.character + 1,
                endLineNumber: relatedInformation.location.range.end.line + 1,
                endColumn: relatedInformation.location.range.end.character + 1,
                message: relatedInformation.message
            };
        }
        asCompletionResult(result) {
            if (!result) {
                return {
                    isIncomplete: false,
                    items: []
                };
            }
            if (Array.isArray(result)) {
                const items = result.map(item => this.asCompletionItem(item));
                return {
                    isIncomplete: false,
                    items
                };
            }
            return {
                isIncomplete: result.isIncomplete,
                items: result.items.map(this.asCompletionItem.bind(this))
            };
        }
        asCompletionItem(item) {
            const result = { label: item.label };
            if (item.detail) {
                result.detail = item.detail;
            }
            if (item.documentation) {
                result.documentation = this.asDocumentation(item.documentation);
                result.documentationFormat = Is.string(item.documentation) ? undefined : item.documentation.kind;
            }
            ;
            if (item.filterText) {
                result.filterText = item.filterText;
            }
            let insertText = this.asCompletionInsertText(item);
            if (insertText) {
                result.insertText = insertText.text;
                result.range = insertText.range;
                result.fromEdit = insertText.fromEdit;
            }
            if (Is.number(item.kind)) {
                let [itemKind, original] = this.asCompletionItemKind(item.kind);
                result.kind = itemKind;
                if (original) {
                    result.originalItemKind = original;
                }
            }
            if (item.sortText) {
                result.sortText = item.sortText;
            }
            if (item.additionalTextEdits) {
                result.additionalTextEdits = this.asTextEdits(item.additionalTextEdits);
            }
            if (Is.stringArray(item.commitCharacters)) {
                result.commitCharacters = item.commitCharacters.slice();
            }
            if (item.command) {
                result.command = this.asCommand(item.command);
            }
            if (item.deprecated === true || item.deprecated === false) {
                result.deprecated = item.deprecated;
            }
            // TODO if (item.preselect === true || item.preselect === false) { result.preselect = item.preselect; }
            if (item.data !== undefined) {
                result.data = item.data;
            }
            return result;
        }
        asCompletionItemKind(value) {
            // Protocol item kind is 1 based, codes item kind is zero based.
            if (services_3.CompletionItemKind.Text <= value && value <= services_3.CompletionItemKind.TypeParameter) {
                return [value - 1, undefined];
            }
            ;
            return [services_3.CompletionItemKind.Text, value];
        }
        asCompletionInsertText(item) {
            if (item.textEdit) {
                const range = this.asRange(item.textEdit.range);
                const value = item.textEdit.newText;
                const text = item.insertTextFormat === services_3.InsertTextFormat.Snippet ? { value } : value;
                return {
                    text, range, fromEdit: true
                };
            }
            if (item.insertText) {
                const value = item.insertText;
                const text = item.insertTextFormat === services_3.InsertTextFormat.Snippet ? { value } : value;
                return { text, fromEdit: false };
            }
            return undefined;
        }
        asDocumentLinks(documentLinks) {
            return documentLinks.map(link => this.asDocumentLink(link));
        }
        asDocumentLink(documentLink) {
            return {
                range: this.asRange(documentLink.range),
                url: documentLink.target,
                data: documentLink.data
            };
        }
        asRange(range) {
            if (range === undefined) {
                return undefined;
            }
            if (range === null) {
                return null;
            }
            const start = this.asPosition(range.start);
            const end = this.asPosition(range.end);
            if (start instanceof monaco.Position && end instanceof monaco.Position) {
                return new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
            }
            const startLineNumber = !start || start.lineNumber === undefined ? undefined : start.lineNumber;
            const startColumn = !start || start.column === undefined ? undefined : start.column;
            const endLineNumber = !end || end.lineNumber === undefined ? undefined : end.lineNumber;
            const endColumn = !end || end.column === undefined ? undefined : end.column;
            return { startLineNumber, startColumn, endLineNumber, endColumn };
        }
        asPosition(position) {
            if (position === undefined) {
                return undefined;
            }
            if (position === null) {
                return null;
            }
            const { line, character } = position;
            const lineNumber = line === undefined ? undefined : line + 1;
            const column = character === undefined ? undefined : character + 1;
            if (lineNumber !== undefined && column !== undefined) {
                return new monaco.Position(lineNumber, column);
            }
            return { lineNumber, column };
        }
        asColorInformations(items) {
            return items.map(item => this.asColorInformation(item));
        }
        asColorInformation(item) {
            return {
                range: this.asRange(item.range),
                color: item.color
            };
        }
        asColorPresentations(items) {
            return items.map(item => this.asColorPresentation(item));
        }
        asColorPresentation(item) {
            return {
                label: item.label,
                textEdit: this.asTextEdit(item.textEdit),
                additionalTextEdits: this.asTextEdits(item.additionalTextEdits)
            };
        }
        asFoldingRanges(items) {
            if (!items) {
                return items;
            }
            return items.map(item => this.asFoldingRange(item));
        }
        asFoldingRange(item) {
            return {
                start: item.startLine + 1,
                end: item.endLine + 1,
                kind: this.asFoldingRangeKind(item.kind)
            };
        }
        asFoldingRangeKind(kind) {
            if (kind) {
                switch (kind) {
                    case services_3.FoldingRangeKind.Comment:
                        return monaco.languages.FoldingRangeKind.Comment;
                    case services_3.FoldingRangeKind.Imports:
                        return monaco.languages.FoldingRangeKind.Imports;
                    case services_3.FoldingRangeKind.Region:
                        return monaco.languages.FoldingRangeKind.Region;
                }
                ;
            }
            return undefined;
        }
    }
    exports.ProtocolToMonacoConverter = ProtocolToMonacoConverter;
});
define("monaco-diagnostic-collection", ["require", "exports", "disposable"], function (require, exports, disposable_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class MonacoDiagnosticCollection {
        constructor(name, p2m) {
            this.name = name;
            this.p2m = p2m;
            this.diagnostics = new Map();
            this.toDispose = new disposable_1.DisposableCollection();
        }
        dispose() {
            this.toDispose.dispose();
        }
        get(uri) {
            const diagnostics = this.diagnostics.get(uri);
            return !!diagnostics ? diagnostics.diagnostics : [];
        }
        set(uri, diagnostics) {
            const existing = this.diagnostics.get(uri);
            if (existing) {
                existing.diagnostics = diagnostics;
            }
            else {
                const modelDiagnostics = new MonacoModelDiagnostics(uri, diagnostics, this.name, this.p2m);
                this.diagnostics.set(uri, modelDiagnostics);
                this.toDispose.push(disposable_1.Disposable.create(() => {
                    this.diagnostics.delete(uri);
                    modelDiagnostics.dispose();
                }));
            }
        }
    }
    exports.MonacoDiagnosticCollection = MonacoDiagnosticCollection;
    class MonacoModelDiagnostics {
        constructor(uri, diagnostics, owner, p2m) {
            this.owner = owner;
            this.p2m = p2m;
            this._markers = [];
            this._diagnostics = [];
            this.uri = monaco.Uri.parse(uri);
            this.diagnostics = diagnostics;
            monaco.editor.onDidCreateModel(model => this.doUpdateModelMarkers(model));
        }
        set diagnostics(diagnostics) {
            this._diagnostics = diagnostics;
            this._markers = this.p2m.asDiagnostics(diagnostics);
            this.updateModelMarkers();
        }
        get diagnostics() {
            return this._diagnostics;
        }
        get markers() {
            return this._markers;
        }
        dispose() {
            this._markers = [];
            this.updateModelMarkers();
        }
        updateModelMarkers() {
            const model = monaco.editor.getModel(this.uri);
            this.doUpdateModelMarkers(model);
        }
        doUpdateModelMarkers(model) {
            if (model && this.uri.toString() === model.uri.toString()) {
                monaco.editor.setModelMarkers(model, this.owner, this._markers);
            }
        }
    }
    exports.MonacoModelDiagnostics = MonacoModelDiagnostics;
});
define("monaco-languages", ["require", "exports", "glob-to-regexp", "services", "monaco-diagnostic-collection", "disposable"], function (require, exports, globToRegExp, services_4, monaco_diagnostic_collection_1, disposable_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MonacoModelIdentifier;
    (function (MonacoModelIdentifier) {
        function fromDocument(document) {
            return {
                uri: monaco.Uri.parse(document.uri),
                languageId: document.languageId
            };
        }
        MonacoModelIdentifier.fromDocument = fromDocument;
        function fromModel(model) {
            return {
                uri: model.uri,
                languageId: model.getModeId()
            };
        }
        MonacoModelIdentifier.fromModel = fromModel;
    })(MonacoModelIdentifier = exports.MonacoModelIdentifier || (exports.MonacoModelIdentifier = {}));
    function testGlob(pattern, value) {
        const regExp = globToRegExp(pattern, {
            extended: true,
            globstar: true
        });
        return regExp.test(value);
    }
    exports.testGlob = testGlob;
    function getLanguages() {
        const languages = [];
        for (const language of monaco.languages.getLanguages().map(l => l.id)) {
            if (languages.indexOf(language) === -1) {
                languages.push(language);
            }
        }
        return languages;
    }
    exports.getLanguages = getLanguages;
    class MonacoLanguages {
        constructor(p2m, m2p) {
            this.p2m = p2m;
            this.m2p = m2p;
        }
        match(selector, document) {
            return this.matchModel(selector, MonacoModelIdentifier.fromDocument(document));
        }
        createDiagnosticCollection(name) {
            return new monaco_diagnostic_collection_1.MonacoDiagnosticCollection(name || 'default', this.p2m);
        }
        registerCompletionItemProvider(selector, provider, ...triggerCharacters) {
            const completionProvider = this.createCompletionProvider(selector, provider, ...triggerCharacters);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerCompletionItemProvider(language, completionProvider));
                }
            }
            ;
            return providers;
        }
        createCompletionProvider(selector, provider, ...triggerCharacters) {
            return {
                triggerCharacters,
                provideCompletionItems: (model, position, token, context) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asCompletionParams(model, position, context);
                    return provider.provideCompletionItems(params, token).then(result => this.p2m.asCompletionResult(result));
                },
                resolveCompletionItem: provider.resolveCompletionItem ? (item, token) => {
                    const protocolItem = this.m2p.asCompletionItem(item);
                    return provider.resolveCompletionItem(protocolItem, token).then(resolvedItem => {
                        const resolvedCompletionItem = this.p2m.asCompletionItem(resolvedItem);
                        Object.assign(item, resolvedCompletionItem);
                        return item;
                    });
                } : undefined
            };
        }
        registerHoverProvider(selector, provider) {
            const hoverProvider = this.createHoverProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerHoverProvider(language, hoverProvider));
                }
            }
            return providers;
        }
        createHoverProvider(selector, provider) {
            return {
                provideHover: (model, position, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return undefined;
                    }
                    const params = this.m2p.asTextDocumentPositionParams(model, position);
                    return provider.provideHover(params, token).then(hover => this.p2m.asHover(hover));
                }
            };
        }
        registerSignatureHelpProvider(selector, provider, ...triggerCharacters) {
            const signatureHelpProvider = this.createSignatureHelpProvider(selector, provider, ...triggerCharacters);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerSignatureHelpProvider(language, signatureHelpProvider));
                }
            }
            return providers;
        }
        createSignatureHelpProvider(selector, provider, ...triggerCharacters) {
            const signatureHelpTriggerCharacters = triggerCharacters;
            return {
                signatureHelpTriggerCharacters,
                provideSignatureHelp: (model, position, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return undefined;
                    }
                    const params = this.m2p.asTextDocumentPositionParams(model, position);
                    return provider.provideSignatureHelp(params, token).then(signatureHelp => this.p2m.asSignatureHelp(signatureHelp));
                }
            };
        }
        registerDefinitionProvider(selector, provider) {
            const definitionProvider = this.createDefinitionProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerDefinitionProvider(language, definitionProvider));
                }
            }
            return providers;
        }
        createDefinitionProvider(selector, provider) {
            return {
                provideDefinition: (model, position, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return undefined;
                    }
                    const params = this.m2p.asTextDocumentPositionParams(model, position);
                    return provider.provideDefinition(params, token).then(result => this.p2m.asDefinitionResult(result));
                }
            };
        }
        registerReferenceProvider(selector, provider) {
            const referenceProvider = this.createReferenceProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerReferenceProvider(language, referenceProvider));
                }
            }
            return providers;
        }
        createReferenceProvider(selector, provider) {
            return {
                provideReferences: (model, position, context, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asReferenceParams(model, position, context);
                    return provider.provideReferences(params, token).then(result => this.p2m.asReferences(result));
                }
            };
        }
        registerDocumentHighlightProvider(selector, provider) {
            const documentHighlightProvider = this.createDocumentHighlightProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerDocumentHighlightProvider(language, documentHighlightProvider));
                }
            }
            return providers;
        }
        createDocumentHighlightProvider(selector, provider) {
            return {
                provideDocumentHighlights: (model, position, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asTextDocumentPositionParams(model, position);
                    return provider.provideDocumentHighlights(params, token).then(result => this.p2m.asDocumentHighlights(result));
                }
            };
        }
        registerDocumentSymbolProvider(selector, provider) {
            const documentSymbolProvider = this.createDocumentSymbolProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerDocumentSymbolProvider(language, documentSymbolProvider));
                }
            }
            return providers;
        }
        createDocumentSymbolProvider(selector, provider) {
            return {
                provideDocumentSymbols: (model, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asDocumentSymbolParams(model);
                    return provider.provideDocumentSymbols(params, token).then(result => this.p2m.asDocumentSymbols(result));
                }
            };
        }
        registerCodeActionsProvider(selector, provider) {
            const codeActionProvider = this.createCodeActionProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerCodeActionProvider(language, codeActionProvider));
                }
            }
            return providers;
        }
        createCodeActionProvider(selector, provider) {
            return {
                provideCodeActions: (model, range, context, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asCodeActionParams(model, range, context);
                    return provider.provideCodeActions(params, token).then(result => this.p2m.asCodeActions(result));
                }
            };
        }
        registerCodeLensProvider(selector, provider) {
            const codeLensProvider = this.createCodeLensProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerCodeLensProvider(language, codeLensProvider));
                }
            }
            return providers;
        }
        createCodeLensProvider(selector, provider) {
            return {
                provideCodeLenses: (model, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asCodeLensParams(model);
                    return provider.provideCodeLenses(params, token).then(result => this.p2m.asCodeLenses(result));
                },
                resolveCodeLens: provider.resolveCodeLens ? (model, codeLens, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return codeLens;
                    }
                    const protocolCodeLens = this.m2p.asCodeLens(codeLens);
                    return provider.resolveCodeLens(protocolCodeLens, token).then(result => {
                        const resolvedCodeLens = this.p2m.asCodeLens(result);
                        Object.assign(codeLens, resolvedCodeLens);
                        return codeLens;
                    });
                } : ((m, codeLens, t) => codeLens)
            };
        }
        registerDocumentFormattingEditProvider(selector, provider) {
            const documentFormattingEditProvider = this.createDocumentFormattingEditProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerDocumentFormattingEditProvider(language, documentFormattingEditProvider));
                }
            }
            return providers;
        }
        createDocumentFormattingEditProvider(selector, provider) {
            return {
                provideDocumentFormattingEdits: (model, options, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asDocumentFormattingParams(model, options);
                    return provider.provideDocumentFormattingEdits(params, token).then(result => this.p2m.asTextEdits(result));
                }
            };
        }
        registerDocumentRangeFormattingEditProvider(selector, provider) {
            const documentRangeFormattingEditProvider = this.createDocumentRangeFormattingEditProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerDocumentRangeFormattingEditProvider(language, documentRangeFormattingEditProvider));
                }
            }
            return providers;
        }
        createDocumentRangeFormattingEditProvider(selector, provider) {
            return {
                provideDocumentRangeFormattingEdits: (model, range, options, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asDocumentRangeFormattingParams(model, range, options);
                    return provider.provideDocumentRangeFormattingEdits(params, token).then(result => this.p2m.asTextEdits(result));
                }
            };
        }
        registerOnTypeFormattingEditProvider(selector, provider, firstTriggerCharacter, ...moreTriggerCharacter) {
            const onTypeFormattingEditProvider = this.createOnTypeFormattingEditProvider(selector, provider, firstTriggerCharacter, ...moreTriggerCharacter);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerOnTypeFormattingEditProvider(language, onTypeFormattingEditProvider));
                }
            }
            return providers;
        }
        createOnTypeFormattingEditProvider(selector, provider, firstTriggerCharacter, ...moreTriggerCharacter) {
            const autoFormatTriggerCharacters = [firstTriggerCharacter].concat(moreTriggerCharacter);
            return {
                autoFormatTriggerCharacters,
                provideOnTypeFormattingEdits: (model, position, ch, options, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const params = this.m2p.asDocumentOnTypeFormattingParams(model, position, ch, options);
                    return provider.provideOnTypeFormattingEdits(params, token).then(result => this.p2m.asTextEdits(result));
                }
            };
        }
        registerRenameProvider(selector, provider) {
            const renameProvider = this.createRenameProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerRenameProvider(language, renameProvider));
                }
            }
            return providers;
        }
        createRenameProvider(selector, provider) {
            return {
                provideRenameEdits: (model, position, newName, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return undefined;
                    }
                    const params = this.m2p.asRenameParams(model, position, newName);
                    return provider.provideRenameEdits(params, token).then(result => this.p2m.asWorkspaceEdit(result));
                }
            };
        }
        registerDocumentLinkProvider(selector, provider) {
            const linkProvider = this.createDocumentLinkProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerLinkProvider(language, linkProvider));
                }
            }
            return providers;
        }
        createDocumentLinkProvider(selector, provider) {
            return {
                provideLinks: (model, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return undefined;
                    }
                    const params = this.m2p.asDocumentLinkParams(model);
                    return provider.provideDocumentLinks(params, token).then(result => this.p2m.asDocumentLinks(result));
                },
                resolveLink: (link, token) => {
                    // resolve the link if the provider supports it
                    // and the link doesn't have a url set
                    if (provider.resolveDocumentLink && (link.url === null || link.url === undefined)) {
                        const documentLink = this.m2p.asDocumentLink(link);
                        return provider.resolveDocumentLink(documentLink, token).then(result => {
                            const resolvedLink = this.p2m.asDocumentLink(result);
                            Object.assign(link, resolvedLink);
                            return link;
                        });
                    }
                    return link;
                }
            };
        }
        registerImplementationProvider(selector, provider) {
            const implementationProvider = this.createImplementationProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerImplementationProvider(language, implementationProvider));
                }
            }
            return providers;
        }
        createImplementationProvider(selector, provider) {
            return {
                provideImplementation: (model, position, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return undefined;
                    }
                    const params = this.m2p.asTextDocumentPositionParams(model, position);
                    return provider.provideImplementation(params, token).then(result => this.p2m.asDefinitionResult(result));
                }
            };
        }
        registerTypeDefinitionProvider(selector, provider) {
            const typeDefinitionProvider = this.createTypeDefinitionProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerTypeDefinitionProvider(language, typeDefinitionProvider));
                }
            }
            return providers;
        }
        createTypeDefinitionProvider(selector, provider) {
            return {
                provideTypeDefinition: (model, position, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return undefined;
                    }
                    const params = this.m2p.asTextDocumentPositionParams(model, position);
                    return provider.provideTypeDefinition(params, token).then(result => this.p2m.asDefinitionResult(result));
                }
            };
        }
        registerColorProvider(selector, provider) {
            const documentColorProvider = this.createDocumentColorProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerColorProvider(language, documentColorProvider));
                }
            }
            return providers;
        }
        createDocumentColorProvider(selector, provider) {
            return {
                provideDocumentColors: (model, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const textDocument = this.m2p.asTextDocumentIdentifier(model);
                    return provider.provideDocumentColors({ textDocument }, token).then(result => this.p2m.asColorInformations(result));
                },
                provideColorPresentations: (model, info, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const textDocument = this.m2p.asTextDocumentIdentifier(model);
                    const range = this.m2p.asRange(info.range);
                    return provider.provideColorPresentations({
                        textDocument,
                        color: info.color,
                        range
                    }, token).then(result => this.p2m.asColorPresentations(result));
                }
            };
        }
        registerFoldingRangeProvider(selector, provider) {
            const foldingRangeProvider = this.createFoldingRangeProvider(selector, provider);
            const providers = new disposable_2.DisposableCollection();
            for (const language of getLanguages()) {
                if (this.matchLanguage(selector, language)) {
                    providers.push(monaco.languages.registerFoldingRangeProvider(language, foldingRangeProvider));
                }
            }
            return providers;
        }
        createFoldingRangeProvider(selector, provider) {
            return {
                provideFoldingRanges: (model, context, token) => {
                    if (!this.matchModel(selector, MonacoModelIdentifier.fromModel(model))) {
                        return [];
                    }
                    const textDocument = this.m2p.asTextDocumentIdentifier(model);
                    return provider.provideFoldingRanges({
                        textDocument
                    }, token).then(result => this.p2m.asFoldingRanges(result));
                }
            };
        }
        matchModel(selector, model) {
            if (Array.isArray(selector)) {
                return selector.some(filter => this.matchModel(filter, model));
            }
            if (services_4.DocumentFilter.is(selector)) {
                if (!!selector.language && selector.language !== model.languageId) {
                    return false;
                }
                if (!!selector.scheme && selector.scheme !== model.uri.scheme) {
                    return false;
                }
                if (!!selector.pattern && !testGlob(selector.pattern, model.uri.path)) {
                    return false;
                }
                return true;
            }
            return selector === model.languageId;
        }
        matchLanguage(selector, languageId) {
            if (Array.isArray(selector)) {
                return selector.some(filter => this.matchLanguage(filter, languageId));
            }
            if (services_4.DocumentFilter.is(selector)) {
                return !selector.language || selector.language === languageId;
            }
            return selector === languageId;
        }
    }
    exports.MonacoLanguages = MonacoLanguages;
});
define("monaco-workspace", ["require", "exports", "services"], function (require, exports, services_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class MonacoWorkspace {
        constructor(p2m, m2p, _rootUri = null) {
            this.p2m = p2m;
            this.m2p = m2p;
            this._rootUri = _rootUri;
            this.documents = new Map();
            this.onDidOpenTextDocumentEmitter = new services_5.Emitter();
            this.onDidCloseTextDocumentEmitter = new services_5.Emitter();
            this.onDidChangeTextDocumentEmitter = new services_5.Emitter();
            for (const model of monaco.editor.getModels()) {
                this.addModel(model);
            }
            monaco.editor.onDidCreateModel(model => this.addModel(model));
            monaco.editor.onWillDisposeModel(model => this.removeModel(model));
        }
        get rootUri() {
            return this._rootUri;
        }
        removeModel(model) {
            const uri = model.uri.toString();
            const document = this.documents.get(uri);
            if (document) {
                this.documents.delete(uri);
                this.onDidCloseTextDocumentEmitter.fire(document);
            }
        }
        addModel(model) {
            const uri = model.uri.toString();
            const document = this.setModel(uri, model);
            this.onDidOpenTextDocumentEmitter.fire(document);
            model.onDidChangeContent(event => this.onDidChangeContent(uri, model, event));
        }
        onDidChangeContent(uri, model, event) {
            const textDocument = this.setModel(uri, model);
            const contentChanges = [];
            for (const change of event.changes) {
                const range = this.m2p.asRange(change.range);
                const rangeLength = change.rangeLength;
                const text = change.text;
                contentChanges.push({ range, rangeLength, text });
            }
            this.onDidChangeTextDocumentEmitter.fire({
                textDocument,
                contentChanges
            });
        }
        setModel(uri, model) {
            const document = services_5.TextDocument.create(uri, model.getModeId(), model.getVersionId(), model.getValue());
            this.documents.set(uri, document);
            return document;
        }
        get textDocuments() {
            return Array.from(this.documents.values());
        }
        get onDidOpenTextDocument() {
            return this.onDidOpenTextDocumentEmitter.event;
        }
        get onDidCloseTextDocument() {
            return this.onDidCloseTextDocumentEmitter.event;
        }
        get onDidChangeTextDocument() {
            return this.onDidChangeTextDocumentEmitter.event;
        }
        applyEdit(workspaceEdit) {
            const edit = this.p2m.asWorkspaceEdit(workspaceEdit);
            // Collect all referenced models
            const models = edit.edits.reduce((acc, currentEdit) => {
                const textEdit = currentEdit;
                acc[textEdit.resource.toString()] = monaco.editor.getModel(textEdit.resource);
                return acc;
            }, {});
            // If any of the models do not exist, refuse to apply the edit.
            if (!Object.keys(models).map(uri => models[uri]).every(model => !!model)) {
                return Promise.resolve(false);
            }
            // Group edits by resource so we can batch them when applying
            const editsByResource = edit.edits.reduce((acc, currentEdit) => {
                const textEdit = currentEdit;
                const uri = textEdit.resource.toString();
                if (!(uri in acc)) {
                    acc[uri] = [];
                }
                const operations = textEdit.edits.map(edit => {
                    return {
                        range: monaco.Range.lift(edit.range),
                        text: edit.text
                    };
                });
                acc[uri].push(...operations);
                return acc;
            }, {});
            // Apply edits for each resource
            Object.keys(editsByResource).forEach(uri => {
                models[uri].pushEditOperations([], // Do not try and preserve editor selections.
                editsByResource[uri].map(resourceEdit => {
                    return {
                        identifier: { major: 1, minor: 0 },
                        range: resourceEdit.range,
                        text: resourceEdit.text,
                        forceMoveMarkers: true,
                    };
                }), () => []);
            });
            return Promise.resolve(true);
        }
    }
    exports.MonacoWorkspace = MonacoWorkspace;
});
define("monaco-services", ["require", "exports", "monaco-converter", "monaco-commands", "monaco-languages", "monaco-workspace", "console-window", "services"], function (require, exports, monaco_converter_1, monaco_commands_1, monaco_languages_1, monaco_workspace_1, console_window_1, services_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var MonacoServices;
    (function (MonacoServices) {
        function create(editor, options = {}) {
            const m2p = new monaco_converter_1.MonacoToProtocolConverter();
            const p2m = new monaco_converter_1.ProtocolToMonacoConverter();
            return {
                commands: new monaco_commands_1.MonacoCommands(editor),
                languages: new monaco_languages_1.MonacoLanguages(p2m, m2p),
                workspace: new monaco_workspace_1.MonacoWorkspace(p2m, m2p, options.rootUri),
                window: new console_window_1.ConsoleWindow()
            };
        }
        MonacoServices.create = create;
        function install(editor, options = {}) {
            const services = create(editor, options);
            services_6.Services.install(services);
            return services;
        }
        MonacoServices.install = install;
        function get() {
            return services_6.Services.get();
        }
        MonacoServices.get = get;
    })(MonacoServices = exports.MonacoServices || (exports.MonacoServices = {}));
});
define("index", ["require", "exports", "disposable", "services", "connection", "monaco-language-client", "monaco-commands", "console-window", "monaco-languages", "monaco-workspace", "monaco-services", "monaco-converter"], function (require, exports, disposable_3, services_7, connection_1, monaco_language_client_1, monaco_commands_2, console_window_2, monaco_languages_2, monaco_workspace_2, monaco_services_1, monaco_converter_2) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    /* --------------------------------------------------------------------------------------------
     * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
     * Licensed under the MIT License. See License.txt in the project root for license information.
     * ------------------------------------------------------------------------------------------ */
    __export(disposable_3);
    __export(services_7);
    __export(connection_1);
    __export(monaco_language_client_1);
    __export(monaco_commands_2);
    __export(console_window_2);
    __export(monaco_languages_2);
    __export(monaco_workspace_2);
    __export(monaco_services_1);
    __export(monaco_converter_2);
});
/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
define("register-vscode", ["require", "exports", "path"], function (require, exports, path) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const Module = module.parent.require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function (id, options) {
        const resolvedId = id === 'vscode' ? path.resolve(__dirname, 'vscode-compatibility.js') : id;
        return originalRequire.call(this, resolvedId, options);
    };
});
/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
define("vscode-api", ["require", "exports", "vscode-uri", "disposable", "services"], function (require, exports, vscode_uri_1, disposable_4, services_8) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function createVSCodeApi(servicesProvider) {
        const unsupported = () => { throw new Error('unsupported'); };
        const Uri = vscode_uri_1.default;
        class CompletionItem {
            constructor(label, kind) {
                this.label = label;
                this.kind = kind;
            }
        }
        class CodeLens {
            constructor(range, command) {
                this.range = range;
                this.command = command;
            }
            get isResolved() {
                return !!this.command;
            }
        }
        class DocumentLink {
            constructor(range, target) {
                this.range = range;
                this.target = target;
            }
        }
        class CodeActionKind {
            constructor(value) {
                this.value = value;
                this.append = unsupported;
                this.contains = unsupported;
            }
        }
        CodeActionKind.Empty = new CodeActionKind();
        CodeActionKind.QuickFix = new CodeActionKind('quickfix');
        CodeActionKind.Refactor = new CodeActionKind('refactor');
        CodeActionKind.RefactorExtract = new CodeActionKind('refactor.extract');
        CodeActionKind.RefactorInline = new CodeActionKind('refactor.inline');
        CodeActionKind.RefactorRewrite = new CodeActionKind('refactor.rewrite');
        CodeActionKind.Source = new CodeActionKind('source');
        CodeActionKind.SourceOrganizeImports = new CodeActionKind('source.organizeImports');
        const workspace = {
            createFileSystemWatcher(globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents) {
                const services = servicesProvider();
                if (typeof globPattern !== 'string') {
                    throw new Error('unsupported');
                }
                if (services.workspace.createFileSystemWatcher) {
                    const watcher = services.workspace.createFileSystemWatcher(globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents);
                    return Object.assign(watcher, {
                        ignoreCreateEvents: !!ignoreCreateEvents,
                        ignoreChangeEvents: !!ignoreChangeEvents,
                        ignoreDeleteEvents: !!ignoreDeleteEvents,
                    });
                }
                return {
                    ignoreCreateEvents: !!ignoreCreateEvents,
                    ignoreChangeEvents: !!ignoreChangeEvents,
                    ignoreDeleteEvents: !!ignoreDeleteEvents,
                    onDidCreate: services_8.Event.None,
                    onDidChange: services_8.Event.None,
                    onDidDelete: services_8.Event.None,
                    dispose: () => { }
                };
            },
            applyEdit: (edit) => __awaiter(this, void 0, void 0, function* () {
                const services = servicesProvider();
                if (services_8.WorkspaceEdit.is(edit)) {
                    return services.workspace.applyEdit(edit);
                }
                throw new Error('unsupported');
            }),
            getConfiguration(section, resource) {
                const { workspace } = servicesProvider();
                const configuration = workspace.configurations ?
                    workspace.configurations.getConfiguration(section, resource ? resource.toString() : undefined) :
                    undefined;
                const result = {
                    get: (section, defaultValue) => {
                        return configuration ? configuration.get(section, defaultValue) : defaultValue;
                    },
                    has: (section) => {
                        return configuration ? configuration.has(section) : false;
                    },
                    inspect: unsupported,
                    update: unsupported
                };
                return Object.assign(result, {
                    toJSON: () => configuration ? configuration.toJSON() : undefined
                });
            },
            get onDidChangeConfiguration() {
                const services = servicesProvider();
                if (services.workspace.configurations) {
                    return services.workspace.configurations.onDidChangeConfiguration;
                }
                return services_8.Event.None;
            },
            get workspaceFolders() {
                const services = servicesProvider();
                const rootUri = services.workspace.rootUri;
                if (!rootUri) {
                    return undefined;
                }
                const uri = Uri.parse(rootUri);
                return [{
                        uri,
                        index: 0,
                        name: uri.toString()
                    }];
            },
            get textDocuments() {
                const services = servicesProvider();
                return services.workspace.textDocuments;
            },
            get onDidOpenTextDocument() {
                const services = servicesProvider();
                return services.workspace.onDidOpenTextDocument;
            },
            get onDidCloseTextDocument() {
                const services = servicesProvider();
                return services.workspace.onDidCloseTextDocument;
            },
            get onDidChangeTextDocument() {
                const services = servicesProvider();
                return (listener, thisArgs, disposables) => {
                    return services.workspace.onDidChangeTextDocument(({ textDocument, contentChanges }) => {
                        const l = listener.bind(thisArgs);
                        l({
                            document: textDocument,
                            contentChanges: contentChanges
                        });
                    }, undefined, disposables);
                };
            },
            get onWillSaveTextDocument() {
                const services = servicesProvider();
                const onWillSaveTextDocument = services.workspace.onWillSaveTextDocument;
                if (!onWillSaveTextDocument) {
                    return services_8.Event.None;
                }
                return (listener, thisArgs, disposables) => {
                    return onWillSaveTextDocument(({ textDocument, reason, waitUntil }) => {
                        const l = listener.bind(thisArgs);
                        l({
                            document: textDocument,
                            reason: reason,
                            waitUntil: (edits) => {
                                if (waitUntil) {
                                    waitUntil(edits);
                                }
                            }
                        });
                    }, undefined, disposables);
                };
            },
            get onDidSaveTextDocument() {
                const services = servicesProvider();
                return services.workspace.onDidSaveTextDocument || services_8.Event.None;
            },
            onDidChangeWorkspaceFolders: services_8.Event.None,
            getWorkspaceFolder: unsupported,
            asRelativePath: unsupported,
            updateWorkspaceFolders: unsupported,
            findFiles: unsupported,
            saveAll: unsupported,
            openTextDocument: unsupported,
            registerTextDocumentContentProvider: unsupported,
            registerTaskProvider: unsupported,
            registerFileSystemProvider: unsupported,
            rootPath: undefined,
            name: undefined
        };
        const languages = {
            match(selector, document) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                if (!services_8.DocumentIdentifier.is(document)) {
                    throw new Error('unexpected document: ' + JSON.stringify(document));
                }
                const services = servicesProvider();
                const result = services.languages.match(selector, document);
                return result ? 1 : 0;
            },
            createDiagnosticCollection(name) {
                const services = servicesProvider();
                const collection = services.languages.createDiagnosticCollection ?
                    services.languages.createDiagnosticCollection(name) : undefined;
                return {
                    name: name || 'default',
                    set(arg0, arg1) {
                        if (collection) {
                            if (arg1) {
                                collection.set(arg0.toString(), arg1);
                            }
                            else {
                                collection.set(arg0.toString(), []);
                            }
                        }
                    },
                    dispose() {
                        if (collection) {
                            collection.dispose();
                        }
                    },
                    delete: unsupported,
                    clear: unsupported,
                    forEach: unsupported,
                    get: unsupported,
                    has: unsupported
                };
            },
            registerCompletionItemProvider(selector, provider, ...triggerCharacters) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerCompletionItemProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                const resolveCompletionItem = provider.resolveCompletionItem;
                return languages.registerCompletionItemProvider(selector, {
                    provideCompletionItems({ textDocument, position, context }, token) {
                        return provider.provideCompletionItems(textDocument, position, token, context || {
                            triggerKind: services_8.CompletionTriggerKind.Invoked
                        });
                    },
                    resolveCompletionItem: resolveCompletionItem ? (item, token) => {
                        return resolveCompletionItem(item, token);
                    } : undefined
                }, ...triggerCharacters);
            },
            registerCodeActionsProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerCodeActionsProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerCodeActionsProvider(selector, {
                    provideCodeActions({ textDocument, range, context }, token) {
                        return provider.provideCodeActions(textDocument, range, context, token);
                    }
                });
            },
            registerCodeLensProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerCodeLensProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                const resolveCodeLens = provider.resolveCodeLens;
                return languages.registerCodeLensProvider(selector, {
                    provideCodeLenses({ textDocument }, token) {
                        return provider.provideCodeLenses(textDocument, token);
                    },
                    resolveCodeLens: resolveCodeLens ? (codeLens, token) => {
                        return resolveCodeLens(codeLens, token);
                    } : undefined
                });
            },
            registerDefinitionProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerDefinitionProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerDefinitionProvider(selector, {
                    provideDefinition({ textDocument, position }, token) {
                        return provider.provideDefinition(textDocument, position, token);
                    }
                });
            },
            registerImplementationProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerImplementationProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerImplementationProvider(selector, {
                    provideImplementation({ textDocument, position }, token) {
                        return provider.provideImplementation(textDocument, position, token);
                    }
                });
            },
            registerTypeDefinitionProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerTypeDefinitionProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerTypeDefinitionProvider(selector, {
                    provideTypeDefinition({ textDocument, position }, token) {
                        return provider.provideTypeDefinition(textDocument, position, token);
                    }
                });
            },
            registerHoverProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (languages.registerHoverProvider) {
                    return languages.registerHoverProvider(selector, {
                        provideHover({ textDocument, position }, token) {
                            return provider.provideHover(textDocument, position, token);
                        }
                    });
                }
                return disposable_4.Disposable.create(() => { });
            },
            registerDocumentHighlightProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerDocumentHighlightProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerDocumentHighlightProvider(selector, {
                    provideDocumentHighlights({ textDocument, position }, token) {
                        return provider.provideDocumentHighlights(textDocument, position, token);
                    }
                });
            },
            registerDocumentSymbolProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerDocumentSymbolProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerDocumentSymbolProvider(selector, {
                    provideDocumentSymbols({ textDocument }, token) {
                        return provider.provideDocumentSymbols(textDocument, token);
                    }
                });
            },
            registerWorkspaceSymbolProvider(provider) {
                const { languages } = servicesProvider();
                if (!languages.registerWorkspaceSymbolProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerWorkspaceSymbolProvider({
                    provideWorkspaceSymbols({ query }, token) {
                        return provider.provideWorkspaceSymbols(query, token);
                    }
                });
            },
            registerReferenceProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerReferenceProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerReferenceProvider(selector, {
                    provideReferences({ textDocument, position, context }, token) {
                        return provider.provideReferences(textDocument, position, context, token);
                    }
                });
            },
            registerRenameProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerRenameProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerRenameProvider(selector, {
                    provideRenameEdits({ textDocument, position, newName }, token) {
                        return provider.provideRenameEdits(textDocument, position, newName, token);
                    }
                });
            },
            registerDocumentFormattingEditProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerDocumentFormattingEditProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerDocumentFormattingEditProvider(selector, {
                    provideDocumentFormattingEdits({ textDocument, options }, token) {
                        return provider.provideDocumentFormattingEdits(textDocument, options, token);
                    }
                });
            },
            registerDocumentRangeFormattingEditProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerDocumentRangeFormattingEditProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerDocumentRangeFormattingEditProvider(selector, {
                    provideDocumentRangeFormattingEdits({ textDocument, range, options }, token) {
                        return provider.provideDocumentRangeFormattingEdits(textDocument, range, options, token);
                    }
                });
            },
            registerOnTypeFormattingEditProvider(selector, provider, firstTriggerCharacter, ...moreTriggerCharacter) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerOnTypeFormattingEditProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerOnTypeFormattingEditProvider(selector, {
                    provideOnTypeFormattingEdits({ textDocument, position, ch, options }, token) {
                        return provider.provideOnTypeFormattingEdits(textDocument, position, ch, options, token);
                    }
                }, firstTriggerCharacter, ...moreTriggerCharacter);
            },
            registerSignatureHelpProvider(selector, provider, ...triggerCharacter) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerSignatureHelpProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerSignatureHelpProvider(selector, {
                    provideSignatureHelp({ textDocument, position }, token) {
                        return provider.provideSignatureHelp(textDocument, position, token);
                    }
                }, ...triggerCharacter);
            },
            registerDocumentLinkProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerDocumentLinkProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                const resolveDocumentLink = provider.resolveDocumentLink;
                return languages.registerDocumentLinkProvider(selector, {
                    provideDocumentLinks({ textDocument }, token) {
                        return provider.provideDocumentLinks(textDocument, token);
                    },
                    resolveDocumentLink: resolveDocumentLink ? (link, token) => {
                        return resolveDocumentLink(link, token);
                    } : undefined
                });
            },
            registerColorProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerColorProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerColorProvider(selector, {
                    provideDocumentColors({ textDocument }, token) {
                        return provider.provideDocumentColors(textDocument, token);
                    },
                    provideColorPresentations({ textDocument, color, range }, token) {
                        return provider.provideColorPresentations(color, {
                            document: textDocument,
                            range: range
                        }, token);
                    }
                });
            },
            registerFoldingRangeProvider(selector, provider) {
                if (!services_8.isDocumentSelector(selector)) {
                    throw new Error('unexpected selector: ' + JSON.stringify(selector));
                }
                const { languages } = servicesProvider();
                if (!languages.registerFoldingRangeProvider) {
                    return disposable_4.Disposable.create(() => { });
                }
                return languages.registerFoldingRangeProvider(selector, {
                    provideFoldingRanges({ textDocument }, token) {
                        return provider.provideFoldingRanges(textDocument, {}, token);
                    }
                });
            },
            getLanguages: unsupported,
            getDiagnostics: unsupported,
            setLanguageConfiguration: unsupported,
            onDidChangeDiagnostics: unsupported
        };
        function showMessage(type, arg0, arg1) {
            if (typeof arg0 !== "string") {
                throw new Error('unexpected message: ' + JSON.stringify(arg0));
            }
            const message = arg0;
            if (arg1 !== undefined && !Array.isArray(arg1)) {
                throw new Error('unexpected actions: ' + JSON.stringify(arg1));
            }
            const actions = arg1 || [];
            const { window } = servicesProvider();
            if (!window) {
                return Promise.resolve(undefined);
            }
            return window.showMessage(type, message, ...actions);
        }
        const window = {
            showInformationMessage: showMessage.bind(undefined, services_8.MessageType.Info),
            showWarningMessage: showMessage.bind(undefined, services_8.MessageType.Warning),
            showErrorMessage: showMessage.bind(undefined, services_8.MessageType.Error),
            createOutputChannel(name) {
                const { window } = servicesProvider();
                const createOutputChannel = window ? window.createOutputChannel : undefined;
                const channel = createOutputChannel ? createOutputChannel.bind(window)(name) : undefined;
                return {
                    name,
                    append: channel.append.bind(channel),
                    appendLine: channel.appendLine.bind(channel),
                    clear: unsupported,
                    show: channel.show.bind(channel),
                    hide: unsupported,
                    dispose: channel.dispose.bind(channel)
                };
            },
            showTextDocument: unsupported,
            createTextEditorDecorationType: unsupported,
            showQuickPick: unsupported,
            showWorkspaceFolderPick: unsupported,
            showOpenDialog: unsupported,
            showSaveDialog: unsupported,
            showInputBox: unsupported,
            createWebviewPanel: unsupported,
            setStatusBarMessage: unsupported,
            withScmProgress: unsupported,
            withProgress: unsupported,
            createStatusBarItem: unsupported,
            createTerminal: unsupported,
            registerTreeDataProvider: unsupported,
            createTreeView: unsupported,
            registerWebviewPanelSerializer: unsupported,
            get activeTextEditor() {
                return unsupported();
            },
            get visibleTextEditors() {
                return unsupported();
            },
            onDidChangeActiveTextEditor: unsupported,
            onDidChangeVisibleTextEditors: unsupported,
            onDidChangeTextEditorSelection: unsupported,
            onDidChangeTextEditorVisibleRanges: unsupported,
            onDidChangeTextEditorOptions: unsupported,
            onDidChangeTextEditorViewColumn: unsupported,
            onDidCloseTerminal: unsupported,
            get state() {
                return unsupported();
            },
            onDidChangeWindowState: unsupported
        };
        const commands = {
            registerCommand(command, callback, thisArg) {
                const { commands } = servicesProvider();
                if (!commands) {
                    return disposable_4.Disposable.create(() => { });
                }
                return commands.registerCommand(command, callback, thisArg);
            },
            registerTextEditorCommand: unsupported,
            executeCommand: unsupported,
            getCommands: unsupported
        };
        class CodeDisposable {
            constructor(callOnDispose) {
                this.callOnDispose = callOnDispose;
            }
            dispose() {
                this.callOnDispose();
            }
        }
        return {
            workspace,
            languages,
            window,
            commands,
            Uri,
            CompletionItem,
            CodeLens,
            DocumentLink,
            CodeActionKind,
            Disposable: CodeDisposable
        };
    }
    exports.createVSCodeApi = createVSCodeApi;
});
define("vscode-compatibility", ["require", "exports", "vscode-api", "services"], function (require, exports, vscode_api_1, services_9) {
    "use strict";
    return vscode_api_1.createVSCodeApi(services_9.Services.get);
});
//# sourceMappingURL=out.js.map