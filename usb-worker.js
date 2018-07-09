'use strict';
importScripts('gp.js');
importScripts('usb-ptp.js');

function displayProgress(text) {
  postMessage({command: 'displayProgress', text: text});
}

function createImage(blob) {
  postMessage({command: 'createImage', blob: blob});
}

function drawImage(blob) {
  postMessage({command: 'drawImage', blob: blob});
}

onmessage = async (event) => {
  switch (event.data.command) {
    case 'fileCapture':
      let startTime = performance.now();
      await fileCapture();
      postMessage({command: 'finished',
        startTime: startTime,
        endTime: performance.now()
      });
      break;
    case 'preview':
      preview(event.data.canvas);
      break;
    default:
      break;
  }
};
