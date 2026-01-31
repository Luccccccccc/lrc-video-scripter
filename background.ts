// 声明 chrome 全局变量
declare const chrome: any;

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('LRC 视频剧本同步器已安装');
});

export {};