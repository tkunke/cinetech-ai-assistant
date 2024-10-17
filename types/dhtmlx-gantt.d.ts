declare module 'dhtmlx-gantt' {
  // Declare the basic methods you are using
  const gantt: {
    init: (container: HTMLElement | null) => void;
    parse: (data: any) => void;
    clearAll: () => void;
    config: any; // You can further expand this as you need
    // Add other methods that you may use in the future
  };

  export default gantt;
}
