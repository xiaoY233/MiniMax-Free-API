/// <reference types="node" />

// 为 MiniMax-Free-API 适配器提供类型定义

declare module "stream" {
  class EventEmitter {
    constructor();
    addListener(event: string, listener: Function): this;
    on(event: string, listener: Function): this;
    once(event: string, listener: Function): this;
    removeListener(event: string, listener: Function): this;
    removeAllListeners(event?: string): this;
    emit(event: string, ...args: any[]): boolean;
    listeners(event: string): Function[];
    listenerCount(event: string): number;
  }
  
  export class PassThrough extends EventEmitter {
    constructor(options?: any);
    write(chunk: any, encoding?: string, cb?: Function): boolean;
    end(chunk?: any, encoding?: string, cb?: Function): void;
    pipe(dest: any, options?: any): any;
    setEncoding(encoding: string): this;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    unpipe(dest?: any): this;
    wrap(oldStream: any): this;
  }
  
  export class Transform extends EventEmitter {
    constructor(options?: any);
    _transform(chunk: any, encoding: string, callback: Function): void;
    _flush(callback: Function): void;
  }
  
  export class Readable extends EventEmitter {
    constructor(options?: any);
    _read(size: number): void;
    push(chunk: any, encoding?: string): boolean;
    unshift(chunk: any, encoding?: string): boolean;
    pause(): this;
    resume(): this;
    isPaused(): boolean;
    pipe(dest: any, options?: any): this;
    unpipe(dest?: any): this;
    wrap(oldStream: any): this;
  }
  
  export class Writable extends EventEmitter {
    constructor(options?: any);
    _write(chunk: any, encoding: string, callback: Function): void;
    write(chunk: any, cb?: Function): boolean;
    end(cb?: Function): void;
    cork(): void;
    uncork(): void;
    setDefaultEncoding(encoding: string): this;
  }
}

declare module "lodash" {
  const _: any;
  export = _;
}