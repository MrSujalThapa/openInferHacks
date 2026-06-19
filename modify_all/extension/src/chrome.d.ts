declare const chrome: {
  runtime?: {
    lastError?: { message?: string };
    onMessage: {
      addListener: (
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ) => void;
    };
  };
  tabs?: {
    query: (
      queryInfo: { active: boolean; currentWindow: boolean },
      callback: (tabs: Array<{ id?: number }>) => void,
    ) => void;
    sendMessage: (
      tabId: number,
      message: unknown,
      callback?: (response: unknown) => void,
    ) => void;
  };
};
