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

onmessage = event => {
  switch (event.data.command) {
    case 'fileCapture':
      fileCapture();
      break;
    case 'preview':
      preview();
      break;
    default:
      break;
  }
};
