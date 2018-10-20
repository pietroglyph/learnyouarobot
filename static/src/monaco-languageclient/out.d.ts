/// <reference types="monaco-editor-core/monaco" />
declare module "services" {
    import { DocumentSelector, MessageActionItem, MessageType, TextDocumentPositionParams, ReferenceParams, CodeActionParams, CodeLensParams, DocumentFormattingParams, DocumentRangeFormattingParams, DocumentOnTypeFormattingParams, RenameParams, DocumentLinkParams, WorkspaceClientCapabilities, DidChangeTextDocumentParams, Diagnostic, TextDocument, CompletionItem, CompletionList, Hover, SignatureHelp, Definition, Location, DocumentHighlight, SymbolInformation, Command, CodeLens, TextEdit, WorkspaceEdit, DocumentLink, TextDocumentSaveReason, DocumentSymbolParams, WorkspaceSymbolParams, TextDocumentContentChangeEvent, CompletionParams, ColorInformation, ColorPresentation, DocumentColorParams, ColorPresentationParams, FoldingRange, FoldingRangeRequestParam, DocumentSymbol, CodeAction } from 'vscode-languageserver-protocol/lib/main';
    import { Disposable, CancellationToken, Event, Emitter } from 'vscode-jsonrpc';
    import Uri from 'vscode-uri';
    export { Disposable, CancellationToken, Event, Emitter };
    export * from 'vscode-languageserver-protocol/lib/main';
    export interface Services {
        languages: Languages;
        workspace: Workspace;
        commands?: Commands;
        window?: Window;
    }
    export namespace Services {
        type Provider = () => Services;
        const get: Provider;
        function install(services: Services): void;
    }
    export function isDocumentSelector(selector: any): selector is DocumentSelector;
    export interface DiagnosticCollection extends Disposable {
        set(uri: string, diagnostics: Diagnostic[]): void;
    }
    export interface CompletionItemProvider {
        provideCompletionItems(params: CompletionParams, token: CancellationToken): Thenable<CompletionItem[] | CompletionList>;
        resolveCompletionItem?(item: CompletionItem, token: CancellationToken): Thenable<CompletionItem>;
    }
    export interface HoverProvider {
        provideHover(params: TextDocumentPositionParams, token: CancellationToken): Thenable<Hover>;
    }
    export interface SignatureHelpProvider {
        provideSignatureHelp(params: TextDocumentPositionParams, token: CancellationToken): Thenable<SignatureHelp>;
    }
    export interface DefinitionProvider {
        provideDefinition(params: TextDocumentPositionParams, token: CancellationToken): Thenable<Definition>;
    }
    export interface ReferenceProvider {
        provideReferences(params: ReferenceParams, token: CancellationToken): Thenable<Location[]>;
    }
    export interface DocumentHighlightProvider {
        provideDocumentHighlights(params: TextDocumentPositionParams, token: CancellationToken): Thenable<DocumentHighlight[]>;
    }
    export interface DocumentSymbolProvider {
        provideDocumentSymbols(params: DocumentSymbolParams, token: CancellationToken): Thenable<SymbolInformation[] | DocumentSymbol[]>;
    }
    export interface WorkspaceSymbolProvider {
        provideWorkspaceSymbols(params: WorkspaceSymbolParams, token: CancellationToken): Thenable<SymbolInformation[]>;
    }
    export interface CodeActionProvider {
        provideCodeActions(params: CodeActionParams, token: CancellationToken): Thenable<(Command | CodeAction)[]>;
    }
    export interface CodeLensProvider {
        provideCodeLenses(params: CodeLensParams, token: CancellationToken): Thenable<CodeLens[]>;
        resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): Thenable<CodeLens>;
    }
    export interface DocumentFormattingEditProvider {
        provideDocumentFormattingEdits(params: DocumentFormattingParams, token: CancellationToken): Thenable<TextEdit[]>;
    }
    export interface DocumentRangeFormattingEditProvider {
        provideDocumentRangeFormattingEdits(params: DocumentRangeFormattingParams, token: CancellationToken): Thenable<TextEdit[]>;
    }
    export interface OnTypeFormattingEditProvider {
        provideOnTypeFormattingEdits(params: DocumentOnTypeFormattingParams, token: CancellationToken): Thenable<TextEdit[]>;
    }
    export interface RenameProvider {
        provideRenameEdits(params: RenameParams, token: CancellationToken): Thenable<WorkspaceEdit>;
    }
    export interface DocumentLinkProvider {
        provideDocumentLinks(params: DocumentLinkParams, token: CancellationToken): Thenable<DocumentLink[]>;
        resolveDocumentLink?(link: DocumentLink, token: CancellationToken): Thenable<DocumentLink>;
    }
    export interface DocumentIdentifier {
        uri: string;
        languageId: string;
    }
    export namespace DocumentIdentifier {
        function is(arg: any): arg is DocumentIdentifier;
    }
    export interface ImplementationProvider {
        provideImplementation(params: TextDocumentPositionParams, token: CancellationToken): Thenable<Definition>;
    }
    export interface TypeDefinitionProvider {
        provideTypeDefinition(params: TextDocumentPositionParams, token: CancellationToken): Thenable<Definition>;
    }
    export interface DocumentColorProvider {
        provideDocumentColors(params: DocumentColorParams, token: CancellationToken): Thenable<ColorInformation[]>;
        provideColorPresentations(params: ColorPresentationParams, token: CancellationToken): Thenable<ColorPresentation[]>;
    }
    export interface FoldingRangeProvider {
        provideFoldingRanges(params: FoldingRangeRequestParam, token: CancellationToken): Thenable<FoldingRange[]>;
    }
    export interface Languages {
        match(selector: DocumentSelector, document: DocumentIdentifier): boolean;
        createDiagnosticCollection?(name?: string): DiagnosticCollection;
        registerCompletionItemProvider?(selector: DocumentSelector, provider: CompletionItemProvider, ...triggerCharacters: string[]): Disposable;
        registerHoverProvider?(selector: DocumentSelector, provider: HoverProvider): Disposable;
        registerSignatureHelpProvider?(selector: DocumentSelector, provider: SignatureHelpProvider, ...triggerCharacters: string[]): Disposable;
        registerDefinitionProvider?(selector: DocumentSelector, provider: DefinitionProvider): Disposable;
        registerReferenceProvider?(selector: DocumentSelector, provider: ReferenceProvider): Disposable;
        registerDocumentHighlightProvider?(selector: DocumentSelector, provider: DocumentHighlightProvider): Disposable;
        registerDocumentSymbolProvider?(selector: DocumentSelector, provider: DocumentSymbolProvider): Disposable;
        registerWorkspaceSymbolProvider?(provider: WorkspaceSymbolProvider): Disposable;
        registerCodeActionsProvider?(selector: DocumentSelector, provider: CodeActionProvider): Disposable;
        registerCodeLensProvider?(selector: DocumentSelector, provider: CodeLensProvider): Disposable;
        registerDocumentFormattingEditProvider?(selector: DocumentSelector, provider: DocumentFormattingEditProvider): Disposable;
        registerDocumentRangeFormattingEditProvider?(selector: DocumentSelector, provider: DocumentRangeFormattingEditProvider): Disposable;
        registerOnTypeFormattingEditProvider?(selector: DocumentSelector, provider: OnTypeFormattingEditProvider, firstTriggerCharacter: string, ...moreTriggerCharacter: string[]): Disposable;
        registerRenameProvider?(selector: DocumentSelector, provider: RenameProvider): Disposable;
        registerDocumentLinkProvider?(selector: DocumentSelector, provider: DocumentLinkProvider): Disposable;
        registerImplementationProvider?(selector: DocumentSelector, provider: ImplementationProvider): Disposable;
        registerTypeDefinitionProvider?(selector: DocumentSelector, provider: TypeDefinitionProvider): Disposable;
        registerColorProvider?(selector: DocumentSelector, provider: DocumentColorProvider): Disposable;
        registerFoldingRangeProvider?(selector: DocumentSelector, provider: FoldingRangeProvider): Disposable;
    }
    export interface TextDocumentDidChangeEvent {
        readonly textDocument: TextDocument;
        readonly contentChanges: TextDocumentContentChangeEvent[];
    }
    export interface TextDocumentWillSaveEvent {
        readonly textDocument: TextDocument;
        readonly reason: TextDocumentSaveReason;
        waitUntil?(thenable: Thenable<TextEdit[]>): void;
    }
    export enum ConfigurationTarget {
        Global = 1,
        Workspace = 2,
        WorkspaceFolder = 3
    }
    export interface WorkspaceConfiguration {
        toJSON(): any;
        get<T>(section: string): T | undefined;
        get<T>(section: string, defaultValue: T): T;
        has(section: string): boolean;
        readonly [key: string]: any;
    }
    export interface FileSystemWatcher extends Disposable {
        readonly onDidCreate: Event<Uri>;
        readonly onDidChange: Event<Uri>;
        readonly onDidDelete: Event<Uri>;
    }
    export interface ConfigurationChangeEvent {
        affectsConfiguration(section: string): boolean;
    }
    export interface Configurations {
        getConfiguration(section?: string, resource?: string): WorkspaceConfiguration;
        readonly onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
    }
    export interface Workspace {
        readonly capabilities?: WorkspaceClientCapabilities;
        readonly rootPath?: string | null;
        readonly rootUri: string | null;
        readonly textDocuments: TextDocument[];
        readonly onDidOpenTextDocument: Event<TextDocument>;
        readonly onDidCloseTextDocument: Event<TextDocument>;
        readonly onDidChangeTextDocument: Event<DidChangeTextDocumentParams>;
        readonly configurations?: Configurations;
        readonly onWillSaveTextDocument?: Event<TextDocumentWillSaveEvent>;
        readonly onDidSaveTextDocument?: Event<TextDocument>;
        applyEdit(changes: WorkspaceEdit): Thenable<boolean>;
        createFileSystemWatcher?(globPattern: string, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean): FileSystemWatcher;
    }
    export interface Commands {
        registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
    }
    export interface OutputChannel extends Disposable {
        append(value: string): void;
        appendLine(line: string): void;
        show(preserveFocus?: boolean): void;
    }
    export interface Window {
        showMessage<T extends MessageActionItem>(type: MessageType, message: string, ...actions: T[]): Thenable<T | undefined>;
        createOutputChannel?(name: string): OutputChannel;
    }
}
declare module "connection" {
    import { Message, MessageType as RPCMessageType, RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler, NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler, Trace, Tracer, CancellationToken, MessageConnection } from 'vscode-jsonrpc';
    import { InitializeParams, InitializeResult, LogMessageParams, ShowMessageParams, DidChangeConfigurationParams, DidOpenTextDocumentParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams, DidSaveTextDocumentParams, DidChangeWatchedFilesParams, PublishDiagnosticsParams } from 'vscode-languageserver-protocol/lib/main';
    import { OutputChannel } from "services";
    export interface IConnection {
        listen(): void;
        sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
        sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;
        sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
        sendRequest<R>(method: string, param: any, token?: CancellationToken): Thenable<R>;
        sendRequest<R>(type: string | RPCMessageType, ...params: any[]): Thenable<R>;
        onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
        onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;
        onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;
        onRequest<R, E>(method: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void;
        sendNotification<RO>(type: NotificationType0<RO>): void;
        sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
        sendNotification(method: string): void;
        sendNotification(method: string, params: any): void;
        sendNotification(method: string | RPCMessageType, params?: any): void;
        onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
        onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;
        onNotification(method: string, handler: GenericNotificationHandler): void;
        onNotification(method: string | RPCMessageType, handler: GenericNotificationHandler): void;
        trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;
        initialize(params: InitializeParams): Thenable<InitializeResult>;
        shutdown(): Thenable<void>;
        exit(): void;
        onLogMessage(handle: NotificationHandler<LogMessageParams>): void;
        onShowMessage(handler: NotificationHandler<ShowMessageParams>): void;
        onTelemetry(handler: NotificationHandler<any>): void;
        didChangeConfiguration(params: DidChangeConfigurationParams): void;
        didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;
        didOpenTextDocument(params: DidOpenTextDocumentParams): void;
        didChangeTextDocument(params: DidChangeTextDocumentParams): void;
        didCloseTextDocument(params: DidCloseTextDocumentParams): void;
        didSaveTextDocument(params: DidSaveTextDocumentParams): void;
        onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>): void;
        dispose(): void;
    }
    export interface ConnectionErrorHandler {
        (error: Error, message: Message | undefined, count: number | undefined): void;
    }
    export interface ConnectionCloseHandler {
        (): void;
    }
    export interface IConnectionProvider {
        get(errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler, outputChannel: OutputChannel | undefined): Thenable<IConnection>;
    }
    export function createConnection(connection: MessageConnection, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection;
}
declare module "console-window" {
    import { MessageActionItem, MessageType, Window, OutputChannel } from "services";
    export class ConsoleWindow implements Window {
        protected readonly channels: Map<string, OutputChannel>;
        showMessage<T extends MessageActionItem>(type: MessageType, message: string, ...actions: T[]): Thenable<T | undefined>;
        createOutputChannel(name: string): OutputChannel;
    }
}
declare module "disposable" {
    import { Disposable } from "services";
    export { Disposable };
    export class DisposableCollection implements Disposable {
        protected readonly disposables: Disposable[];
        dispose(): void;
        push(disposable: Disposable): Disposable;
    }
}
declare module "monaco-language-client" {
    import { BaseLanguageClient, MessageTransports, LanguageClientOptions } from "vscode-base-languageclient/lib/client";
    import { IConnectionProvider, IConnection } from "connection";
    export * from 'vscode-base-languageclient/lib/client';
    export class MonacoLanguageClient extends BaseLanguageClient {
        static bypassConversion: (result: any) => any;
        protected readonly connectionProvider: IConnectionProvider;
        constructor({ id, name, clientOptions, connectionProvider }: MonacoLanguageClient.Options);
        protected doCreateConnection(): Thenable<IConnection>;
        protected createMessageTransports(encoding: string): Thenable<MessageTransports>;
        protected registerBuiltinFeatures(): void;
    }
    export namespace MonacoLanguageClient {
        interface Options {
            name: string;
            id?: string;
            clientOptions: LanguageClientOptions;
            connectionProvider: IConnectionProvider;
        }
    }
}
declare module "monaco-commands" {
    import { Commands, Disposable } from "services";
    export class MonacoCommands implements Commands {
        protected readonly editor: monaco.editor.IStandaloneCodeEditor;
        constructor(editor: monaco.editor.IStandaloneCodeEditor);
        registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;
    }
}
declare module "monaco-converter" {
    import { CodeActionParams, CodeLensParams, DocumentFormattingParams, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams, ReferenceParams, RenameParams, TextDocumentPositionParams, Position, TextDocumentIdentifier, CompletionItem, CompletionList, CompletionParams, CompletionContext, CompletionTriggerKind, Range, Diagnostic, CompletionItemKind, Hover, SignatureHelp, SignatureInformation, ParameterInformation, Definition, Location, DocumentHighlight, SymbolInformation, DocumentSymbolParams, CodeActionContext, DiagnosticSeverity, Command, CodeLens, FormattingOptions, TextEdit, WorkspaceEdit, DocumentLinkParams, DocumentLink, MarkedString, MarkupContent, ColorInformation, ColorPresentation, FoldingRange, DiagnosticRelatedInformation, SymbolKind, DocumentSymbol, CodeAction } from "services";
    import IReadOnlyModel = monaco.editor.IReadOnlyModel;
    export type RecursivePartial<T> = {
        [P in keyof T]?: RecursivePartial<T[P]>;
    };
    export interface ProtocolDocumentLink extends monaco.languages.ILink {
        data?: any;
    }
    export namespace ProtocolDocumentLink {
        function is(item: any): item is ProtocolDocumentLink;
    }
    export interface ProtocolCodeLens extends monaco.languages.ICodeLensSymbol {
        data?: any;
    }
    export namespace ProtocolCodeLens {
        function is(item: any): item is ProtocolCodeLens;
    }
    export interface ProtocolCompletionItem extends monaco.languages.CompletionItem {
        data?: any;
        fromEdit?: boolean;
        documentationFormat?: string;
        originalItemKind?: CompletionItemKind;
        deprecated?: boolean;
    }
    export namespace ProtocolCompletionItem {
        function is(item: any): item is ProtocolCompletionItem;
    }
    export class MonacoToProtocolConverter {
        asPosition(lineNumber: undefined | null, column: undefined | null): {};
        asPosition(lineNumber: number, column: undefined | null): Pick<Position, 'line'>;
        asPosition(lineNumber: undefined | null, column: number): Pick<Position, 'character'>;
        asPosition(lineNumber: number, column: number): Position;
        asPosition(lineNumber: number | undefined | null, column: number | undefined | null): Partial<Position>;
        asRange(range: null): null;
        asRange(range: undefined): undefined;
        asRange(range: monaco.IRange): Range;
        asRange(range: monaco.IRange | undefined): Range | undefined;
        asRange(range: monaco.IRange | null): Range | null;
        asRange(range: Partial<monaco.IRange>): RecursivePartial<Range>;
        asRange(range: Partial<monaco.IRange> | undefined): RecursivePartial<Range> | undefined;
        asRange(range: Partial<monaco.IRange> | null): RecursivePartial<Range> | null;
        asTextDocumentIdentifier(model: IReadOnlyModel): TextDocumentIdentifier;
        asTextDocumentPositionParams(model: IReadOnlyModel, position: monaco.Position): TextDocumentPositionParams;
        asCompletionParams(model: IReadOnlyModel, position: monaco.Position, context: monaco.languages.CompletionContext): CompletionParams;
        asCompletionContext(context: monaco.languages.CompletionContext): CompletionContext;
        asTriggerKind(triggerKind: monaco.languages.SuggestTriggerKind): CompletionTriggerKind;
        asCompletionItem(item: monaco.languages.CompletionItem): CompletionItem;
        protected asCompletionItemKind(value: monaco.languages.CompletionItemKind, original: CompletionItemKind | undefined): CompletionItemKind;
        protected asDocumentation(format: string, documentation: string | monaco.IMarkdownString): string | MarkupContent;
        protected fillPrimaryInsertText(target: CompletionItem, source: ProtocolCompletionItem): void;
        asTextEdit(edit: monaco.editor.ISingleEditOperation): TextEdit;
        asTextEdits(items: monaco.editor.ISingleEditOperation[]): TextEdit[];
        asTextEdits(items: undefined | null): undefined;
        asTextEdits(items: monaco.editor.ISingleEditOperation[] | undefined | null): TextEdit[] | undefined;
        asReferenceParams(model: IReadOnlyModel, position: monaco.Position, options: {
            includeDeclaration: boolean;
        }): ReferenceParams;
        asDocumentSymbolParams(model: IReadOnlyModel): DocumentSymbolParams;
        asCodeLensParams(model: IReadOnlyModel): CodeLensParams;
        asDiagnosticSeverity(value: monaco.MarkerSeverity): DiagnosticSeverity | undefined;
        asDiagnostic(marker: monaco.editor.IMarkerData): Diagnostic;
        asDiagnostics(markers: monaco.editor.IMarkerData[]): Diagnostic[];
        asCodeActionContext(context: monaco.languages.CodeActionContext): CodeActionContext;
        asCodeActionParams(model: IReadOnlyModel, range: monaco.Range, context: monaco.languages.CodeActionContext): CodeActionParams;
        asCommand(item: monaco.languages.Command | undefined | null): Command | undefined;
        asCodeLens(item: monaco.languages.ICodeLensSymbol): CodeLens;
        asFormattingOptions(options: monaco.languages.FormattingOptions): FormattingOptions;
        asDocumentFormattingParams(model: IReadOnlyModel, options: monaco.languages.FormattingOptions): DocumentFormattingParams;
        asDocumentRangeFormattingParams(model: IReadOnlyModel, range: monaco.Range, options: monaco.languages.FormattingOptions): DocumentRangeFormattingParams;
        asDocumentOnTypeFormattingParams(model: IReadOnlyModel, position: monaco.IPosition, ch: string, options: monaco.languages.FormattingOptions): DocumentOnTypeFormattingParams;
        asRenameParams(model: IReadOnlyModel, position: monaco.IPosition, newName: string): RenameParams;
        asDocumentLinkParams(model: IReadOnlyModel): DocumentLinkParams;
        asDocumentLink(item: monaco.languages.ILink): DocumentLink;
    }
    export class ProtocolToMonacoConverter {
        asResourceEdits(resource: monaco.Uri, edits: TextEdit[], modelVersionId?: number): monaco.languages.ResourceTextEdit;
        asWorkspaceEdit(item: WorkspaceEdit): monaco.languages.WorkspaceEdit;
        asWorkspaceEdit(item: undefined | null): undefined;
        asWorkspaceEdit(item: WorkspaceEdit | undefined | null): monaco.languages.WorkspaceEdit | undefined;
        asTextEdit(edit: TextEdit): monaco.languages.TextEdit;
        asTextEdit(edit: undefined | null): undefined;
        asTextEdit(edit: TextEdit | undefined | null): undefined;
        asTextEdits(items: TextEdit[]): monaco.editor.ISingleEditOperation[];
        asTextEdits(items: undefined | null): undefined;
        asTextEdits(items: TextEdit[] | undefined | null): monaco.editor.ISingleEditOperation[] | undefined;
        asCodeLens(item: CodeLens): monaco.languages.ICodeLensSymbol;
        asCodeLens(item: undefined | null): undefined;
        asCodeLens(item: CodeLens | undefined | null): monaco.languages.ICodeLensSymbol | undefined;
        asCodeLenses(items: CodeLens[]): monaco.languages.ICodeLensSymbol[];
        asCodeLenses(items: undefined | null): undefined;
        asCodeLenses(items: CodeLens[] | undefined | null): monaco.languages.ICodeLensSymbol[] | undefined;
        asCodeActions(actions: (Command | CodeAction)[]): monaco.languages.CodeAction[];
        asCodeAction(item: Command | CodeAction): monaco.languages.CodeAction;
        asCommand(command: Command): monaco.languages.Command;
        asCommand(command: undefined): undefined;
        asCommand(command: Command | undefined): monaco.languages.Command | undefined;
        asDocumentSymbol(value: DocumentSymbol): monaco.languages.DocumentSymbol;
        asDocumentSymbols(values: SymbolInformation[] | DocumentSymbol[]): monaco.languages.DocumentSymbol[];
        asSymbolInformations(values: SymbolInformation[], uri?: monaco.Uri): monaco.languages.DocumentSymbol[];
        asSymbolInformations(values: undefined | null, uri?: monaco.Uri): undefined;
        asSymbolInformations(values: SymbolInformation[] | undefined | null, uri?: monaco.Uri): monaco.languages.DocumentSymbol[] | undefined;
        asSymbolInformation(item: SymbolInformation, uri?: monaco.Uri): monaco.languages.DocumentSymbol;
        asSymbolKind(item: SymbolKind): monaco.languages.SymbolKind;
        asDocumentHighlights(values: DocumentHighlight[]): monaco.languages.DocumentHighlight[];
        asDocumentHighlights(values: undefined | null): undefined;
        asDocumentHighlights(values: DocumentHighlight[] | undefined | null): monaco.languages.DocumentHighlight[] | undefined;
        asDocumentHighlight(item: DocumentHighlight): monaco.languages.DocumentHighlight;
        asDocumentHighlightKind(item: number): monaco.languages.DocumentHighlightKind;
        asReferences(values: Location[]): monaco.languages.Location[];
        asReferences(values: undefined | null): monaco.languages.Location[] | undefined;
        asReferences(values: Location[] | undefined | null): monaco.languages.Location[] | undefined;
        asDefinitionResult(item: Definition): monaco.languages.Definition;
        asDefinitionResult(item: undefined | null): undefined;
        asDefinitionResult(item: Definition | undefined | null): monaco.languages.Definition | undefined;
        asLocation(item: Location): monaco.languages.Location;
        asLocation(item: undefined | null): undefined;
        asLocation(item: Location | undefined | null): monaco.languages.Location | undefined;
        asSignatureHelp(item: undefined | null): undefined;
        asSignatureHelp(item: SignatureHelp): monaco.languages.SignatureHelp;
        asSignatureHelp(item: SignatureHelp | undefined | null): monaco.languages.SignatureHelp | undefined;
        asSignatureInformations(items: SignatureInformation[]): monaco.languages.SignatureInformation[];
        asSignatureInformation(item: SignatureInformation): monaco.languages.SignatureInformation;
        asParameterInformations(item: ParameterInformation[]): monaco.languages.ParameterInformation[];
        asParameterInformation(item: ParameterInformation): monaco.languages.ParameterInformation;
        asHover(hover: Hover): monaco.languages.Hover;
        asHover(hover: undefined | null): undefined;
        asHover(hover: Hover | undefined | null): monaco.languages.Hover | undefined;
        asHoverContent(contents: MarkedString | MarkedString[] | MarkupContent): monaco.IMarkdownString[];
        asDocumentation(value: string | MarkupContent): string | monaco.IMarkdownString;
        asMarkdownString(content: MarkedString | MarkupContent): monaco.IMarkdownString;
        asSeverity(severity?: number): monaco.MarkerSeverity;
        asDiagnostics(diagnostics: undefined): undefined;
        asDiagnostics(diagnostics: Diagnostic[]): monaco.editor.IMarkerData[];
        asDiagnostics(diagnostics: Diagnostic[] | undefined): monaco.editor.IMarkerData[] | undefined;
        asDiagnostic(diagnostic: Diagnostic): monaco.editor.IMarkerData;
        asRelatedInformations(relatedInformation?: DiagnosticRelatedInformation[]): monaco.editor.IRelatedInformation[] | undefined;
        asRelatedInformation(relatedInformation: DiagnosticRelatedInformation): monaco.editor.IRelatedInformation;
        asCompletionResult(result: CompletionItem[] | CompletionList | null | undefined): monaco.languages.CompletionList;
        asCompletionItem(item: CompletionItem): ProtocolCompletionItem;
        asCompletionItemKind(value: CompletionItemKind): [monaco.languages.CompletionItemKind, CompletionItemKind | undefined];
        asCompletionInsertText(item: CompletionItem): {
            text: string | monaco.languages.SnippetString;
            range?: monaco.Range;
            fromEdit: boolean;
        } | undefined;
        asDocumentLinks(documentLinks: DocumentLink[]): ProtocolDocumentLink[];
        asDocumentLink(documentLink: DocumentLink): ProtocolDocumentLink;
        asRange(range: null): null;
        asRange(range: undefined): undefined;
        asRange(range: Range): monaco.Range;
        asRange(range: Range | undefined): monaco.Range | undefined;
        asRange(range: Range | null): monaco.Range | null;
        asRange(range: RecursivePartial<Range>): Partial<monaco.IRange>;
        asRange(range: RecursivePartial<Range> | undefined): monaco.Range | Partial<monaco.IRange> | undefined;
        asRange(range: RecursivePartial<Range> | null): monaco.Range | Partial<monaco.IRange> | null;
        asPosition(position: null): null;
        asPosition(position: undefined): undefined;
        asPosition(position: Position): monaco.Position;
        asPosition(position: Position | undefined): monaco.Position | undefined;
        asPosition(position: Position | null): monaco.Position | null;
        asPosition(position: Partial<Position>): Partial<monaco.IPosition>;
        asPosition(position: Partial<Position> | undefined): monaco.Position | Partial<monaco.IPosition> | undefined;
        asPosition(position: Partial<Position> | null): monaco.Position | Partial<monaco.IPosition> | null;
        asColorInformations(items: ColorInformation[]): monaco.languages.IColorInformation[];
        asColorInformation(item: ColorInformation): monaco.languages.IColorInformation;
        asColorPresentations(items: ColorPresentation[]): monaco.languages.IColorPresentation[];
        asColorPresentation(item: ColorPresentation): monaco.languages.IColorPresentation;
        asFoldingRanges(items: undefined | null): undefined | null;
        asFoldingRanges(items: FoldingRange[]): monaco.languages.FoldingRange[];
        asFoldingRange(item: FoldingRange): monaco.languages.FoldingRange;
        asFoldingRangeKind(kind?: string): monaco.languages.FoldingRangeKind | undefined;
    }
}
declare module "monaco-diagnostic-collection" {
    import { DiagnosticCollection, Diagnostic } from "services";
    import { DisposableCollection, Disposable } from "disposable";
    import { ProtocolToMonacoConverter } from "monaco-converter";
    import IModel = monaco.editor.IModel;
    import IMarkerData = monaco.editor.IMarkerData;
    export class MonacoDiagnosticCollection implements DiagnosticCollection {
        protected readonly name: string;
        protected readonly p2m: ProtocolToMonacoConverter;
        protected readonly diagnostics: Map<string, MonacoModelDiagnostics | undefined>;
        protected readonly toDispose: DisposableCollection;
        constructor(name: string, p2m: ProtocolToMonacoConverter);
        dispose(): void;
        get(uri: string): Diagnostic[];
        set(uri: string, diagnostics: Diagnostic[]): void;
    }
    export class MonacoModelDiagnostics implements Disposable {
        readonly owner: string;
        protected readonly p2m: ProtocolToMonacoConverter;
        readonly uri: monaco.Uri;
        protected _markers: IMarkerData[];
        protected _diagnostics: Diagnostic[];
        constructor(uri: string, diagnostics: Diagnostic[], owner: string, p2m: ProtocolToMonacoConverter);
        diagnostics: Diagnostic[];
        readonly markers: ReadonlyArray<IMarkerData>;
        dispose(): void;
        updateModelMarkers(): void;
        protected doUpdateModelMarkers(model: IModel | undefined): void;
    }
}
declare module "monaco-languages" {
    import { Languages, DiagnosticCollection, CompletionItemProvider, DocumentIdentifier, HoverProvider, SignatureHelpProvider, DefinitionProvider, ReferenceProvider, DocumentHighlightProvider, DocumentSymbolProvider, CodeActionProvider, CodeLensProvider, DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider, OnTypeFormattingEditProvider, RenameProvider, DocumentFilter, DocumentSelector, DocumentLinkProvider, ImplementationProvider, TypeDefinitionProvider, DocumentColorProvider, FoldingRangeProvider } from "services";
    import { ProtocolToMonacoConverter, MonacoToProtocolConverter } from "monaco-converter";
    import { Disposable } from "disposable";
    export interface MonacoModelIdentifier {
        uri: monaco.Uri;
        languageId: string;
    }
    export namespace MonacoModelIdentifier {
        function fromDocument(document: DocumentIdentifier): MonacoModelIdentifier;
        function fromModel(model: monaco.editor.IReadOnlyModel): MonacoModelIdentifier;
    }
    export function testGlob(pattern: string, value: string): boolean;
    export function getLanguages(): string[];
    export class MonacoLanguages implements Languages {
        protected readonly p2m: ProtocolToMonacoConverter;
        protected readonly m2p: MonacoToProtocolConverter;
        constructor(p2m: ProtocolToMonacoConverter, m2p: MonacoToProtocolConverter);
        match(selector: DocumentSelector, document: DocumentIdentifier): boolean;
        createDiagnosticCollection(name?: string): DiagnosticCollection;
        registerCompletionItemProvider(selector: DocumentSelector, provider: CompletionItemProvider, ...triggerCharacters: string[]): Disposable;
        protected createCompletionProvider(selector: DocumentSelector, provider: CompletionItemProvider, ...triggerCharacters: string[]): monaco.languages.CompletionItemProvider;
        registerHoverProvider(selector: DocumentSelector, provider: HoverProvider): Disposable;
        protected createHoverProvider(selector: DocumentSelector, provider: HoverProvider): monaco.languages.HoverProvider;
        registerSignatureHelpProvider(selector: DocumentSelector, provider: SignatureHelpProvider, ...triggerCharacters: string[]): Disposable;
        protected createSignatureHelpProvider(selector: DocumentSelector, provider: SignatureHelpProvider, ...triggerCharacters: string[]): monaco.languages.SignatureHelpProvider;
        registerDefinitionProvider(selector: DocumentSelector, provider: DefinitionProvider): Disposable;
        protected createDefinitionProvider(selector: DocumentSelector, provider: DefinitionProvider): monaco.languages.DefinitionProvider;
        registerReferenceProvider(selector: DocumentSelector, provider: ReferenceProvider): Disposable;
        protected createReferenceProvider(selector: DocumentSelector, provider: ReferenceProvider): monaco.languages.ReferenceProvider;
        registerDocumentHighlightProvider(selector: DocumentSelector, provider: DocumentHighlightProvider): Disposable;
        protected createDocumentHighlightProvider(selector: DocumentSelector, provider: DocumentHighlightProvider): monaco.languages.DocumentHighlightProvider;
        registerDocumentSymbolProvider(selector: DocumentSelector, provider: DocumentSymbolProvider): Disposable;
        protected createDocumentSymbolProvider(selector: DocumentSelector, provider: DocumentSymbolProvider): monaco.languages.DocumentSymbolProvider;
        registerCodeActionsProvider(selector: DocumentSelector, provider: CodeActionProvider): Disposable;
        protected createCodeActionProvider(selector: DocumentSelector, provider: CodeActionProvider): monaco.languages.CodeActionProvider;
        registerCodeLensProvider(selector: DocumentSelector, provider: CodeLensProvider): Disposable;
        protected createCodeLensProvider(selector: DocumentSelector, provider: CodeLensProvider): monaco.languages.CodeLensProvider;
        registerDocumentFormattingEditProvider(selector: DocumentSelector, provider: DocumentFormattingEditProvider): Disposable;
        protected createDocumentFormattingEditProvider(selector: DocumentSelector, provider: DocumentFormattingEditProvider): monaco.languages.DocumentFormattingEditProvider;
        registerDocumentRangeFormattingEditProvider(selector: DocumentSelector, provider: DocumentRangeFormattingEditProvider): Disposable;
        createDocumentRangeFormattingEditProvider(selector: DocumentSelector, provider: DocumentRangeFormattingEditProvider): monaco.languages.DocumentRangeFormattingEditProvider;
        registerOnTypeFormattingEditProvider(selector: DocumentSelector, provider: OnTypeFormattingEditProvider, firstTriggerCharacter: string, ...moreTriggerCharacter: string[]): Disposable;
        protected createOnTypeFormattingEditProvider(selector: DocumentSelector, provider: OnTypeFormattingEditProvider, firstTriggerCharacter: string, ...moreTriggerCharacter: string[]): monaco.languages.OnTypeFormattingEditProvider;
        registerRenameProvider(selector: DocumentSelector, provider: RenameProvider): Disposable;
        protected createRenameProvider(selector: DocumentSelector, provider: RenameProvider): monaco.languages.RenameProvider;
        registerDocumentLinkProvider(selector: DocumentSelector, provider: DocumentLinkProvider): Disposable;
        protected createDocumentLinkProvider(selector: DocumentSelector, provider: DocumentLinkProvider): monaco.languages.LinkProvider;
        registerImplementationProvider(selector: DocumentSelector, provider: ImplementationProvider): Disposable;
        protected createImplementationProvider(selector: DocumentSelector, provider: ImplementationProvider): monaco.languages.ImplementationProvider;
        registerTypeDefinitionProvider(selector: DocumentSelector, provider: TypeDefinitionProvider): Disposable;
        protected createTypeDefinitionProvider(selector: DocumentSelector, provider: TypeDefinitionProvider): monaco.languages.TypeDefinitionProvider;
        registerColorProvider(selector: DocumentSelector, provider: DocumentColorProvider): Disposable;
        protected createDocumentColorProvider(selector: DocumentSelector, provider: DocumentColorProvider): monaco.languages.DocumentColorProvider;
        registerFoldingRangeProvider(selector: DocumentSelector, provider: FoldingRangeProvider): Disposable;
        protected createFoldingRangeProvider(selector: DocumentSelector, provider: FoldingRangeProvider): monaco.languages.FoldingRangeProvider;
        protected matchModel(selector: string | DocumentFilter | DocumentSelector, model: MonacoModelIdentifier): boolean;
        protected matchLanguage(selector: string | DocumentFilter | DocumentSelector, languageId: string): boolean;
    }
}
declare module "monaco-workspace" {
    import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from "monaco-converter";
    import { Workspace, WorkspaceEdit, TextDocumentDidChangeEvent, TextDocument, Event, Emitter } from "services";
    import IModel = monaco.editor.IModel;
    export class MonacoWorkspace implements Workspace {
        protected readonly p2m: ProtocolToMonacoConverter;
        protected readonly m2p: MonacoToProtocolConverter;
        protected _rootUri: string | null;
        protected readonly documents: Map<string, TextDocument>;
        protected readonly onDidOpenTextDocumentEmitter: Emitter<TextDocument>;
        protected readonly onDidCloseTextDocumentEmitter: Emitter<TextDocument>;
        protected readonly onDidChangeTextDocumentEmitter: Emitter<TextDocumentDidChangeEvent>;
        constructor(p2m: ProtocolToMonacoConverter, m2p: MonacoToProtocolConverter, _rootUri?: string | null);
        readonly rootUri: string | null;
        protected removeModel(model: IModel): void;
        protected addModel(model: IModel): void;
        protected onDidChangeContent(uri: string, model: IModel, event: monaco.editor.IModelContentChangedEvent): void;
        protected setModel(uri: string, model: IModel): TextDocument;
        readonly textDocuments: TextDocument[];
        readonly onDidOpenTextDocument: Event<TextDocument>;
        readonly onDidCloseTextDocument: Event<TextDocument>;
        readonly onDidChangeTextDocument: Event<TextDocumentDidChangeEvent>;
        applyEdit(workspaceEdit: WorkspaceEdit): Promise<boolean>;
    }
}
declare module "monaco-services" {
    import { MonacoCommands } from "monaco-commands";
    import { MonacoLanguages } from "monaco-languages";
    import { MonacoWorkspace } from "monaco-workspace";
    import { ConsoleWindow } from "console-window";
    import { Services } from "services";
    export interface MonacoServices extends Services {
        commands: MonacoCommands;
        languages: MonacoLanguages;
        workspace: MonacoWorkspace;
        window: ConsoleWindow;
    }
    export namespace MonacoServices {
        interface Options {
            rootUri?: string;
        }
        type Provider = () => MonacoServices;
        function create(editor: monaco.editor.IStandaloneCodeEditor, options?: Options): MonacoServices;
        function install(editor: monaco.editor.IStandaloneCodeEditor, options?: Options): MonacoServices;
        function get(): MonacoServices;
    }
}
declare module "index" {
    export * from "disposable";
    export * from "services";
    export * from "connection";
    export * from "monaco-language-client";
    export * from "monaco-commands";
    export * from "console-window";
    export * from "monaco-languages";
    export * from "monaco-workspace";
    export * from "monaco-services";
    export * from "monaco-converter";
}
declare module "register-vscode" { }
declare module "vscode-api" {
    import * as vscode from "vscode";
    import { Services } from "services";
    export function createVSCodeApi(servicesProvider: Services.Provider): typeof vscode;
}
declare module "vscode-compatibility" {
    const _default: typeof import("vscode");
    export = _default;
}
//# sourceMappingURL=out.d.ts.map