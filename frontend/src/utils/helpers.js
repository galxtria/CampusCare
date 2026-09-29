import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';

export const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, { width: 300, margin: 1 });
  } catch (err) {
    console.error('QR generation failed:', err);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
};

export const sendNotification = (title, options = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      ...options,
    });
  }
};

export const exportPDF = (html, filename) => {
  const element = document.createElement('div');
  element.innerHTML = html;
  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  };
  html2pdf().set(opt).from(element).save();
};
