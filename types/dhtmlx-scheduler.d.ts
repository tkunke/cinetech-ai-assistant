declare module 'dhtmlx-scheduler' {
    const scheduler: {
      init: (container: HTMLElement | null, date: Date, view: string) => void;
      parse: (data: any, type: string) => void;
      clearAll: () => void;
    };
    export default scheduler;
  }
  