
declare module 'simple-peer' {
  namespace SimplePeer {
    interface Options {
      initiator?: boolean;
      channelName?: string;
      channelConfig?: any;
      config?: any;
      stream?: MediaStream;
      streams?: MediaStream[];
      trickle?: boolean;
      allowHalfOpen?: boolean;
      objectMode?: boolean;
    }

    interface Instance extends NodeJS.EventEmitter {
      signal(data: any): void;
      send(data: any): void;
      destroy(err?: Error): void;
      readonly destroyed: boolean;
      on(event: string, listener: (...args: any[]) => void): this;
      on(event: 'signal', listener: (data: any) => void): this;
      on(event: 'stream', listener: (stream: MediaStream) => void): this;
      on(event: 'error', listener: (err: Error) => void): this;
      on(event: 'connect', listener: () => void): this;
      on(event: 'close', listener: () => void): this;
      on(event: 'data', listener: (data: any) => void): this;
    }
  }

  interface SimplePeerConstructor {
    new (opts?: SimplePeer.Options): SimplePeer.Instance;
  }

  const SimplePeer: SimplePeerConstructor;
  export = SimplePeer;
}
