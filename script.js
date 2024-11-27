let tempChart = null; // ตัวแปร global สำหรับเก็บ chart instance

// ฟังก์ชันเพื่อดึงข้อมูลจาก API
async function fetchTemperatureData() {
  try {
    const response = await fetch('http://localhost:4000/temperature');
    if (!response.ok) {
      throw new Error('Error fetching temperature data');
    }
    const data = await response.json();
    console.log('API Data:', data); // ตรวจสอบข้อมูลที่ได้จาก API
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// ฟังก์ชันสำหรับแสดงข้อมูลบน Dashboard
async function loadDashboard() {
  const data = await fetchTemperatureData();

  // ตรวจสอบข้อมูลที่ได้จาก API
  if (data && Array.isArray(data) && data.length > 0) {
    // แสดงข้อมูลอุณหภูมิ
    const temperature = data[0].avgTemperature;  // ใช้ avgTemperature จาก API
    document.getElementById('temperature').innerText = `${temperature.toFixed(2)} °C`;

    // แสดงกราฟ
    const labels = data.map(item => item.timestampThai); // ใช้ timestampThai
    const temperatures = data.map(item => item.avgTemperature);  // ใช้ avgTemperature

    const ctx = document.getElementById('tempChart').getContext('2d');

    // ถ้ามี chart อยู่แล้ว (tempChart) ให้ทำการเพิ่มข้อมูลใหม่
    if (tempChart) {
      // เพิ่มข้อมูลใหม่ในกราฟ
      tempChart.data.labels.push(...labels); // เพิ่ม labels ใหม่
      tempChart.data.datasets[0].data.push(...temperatures); // เพิ่มข้อมูลอุณหภูมิใหม่
      tempChart.update(); // รีเฟรชกราฟ
    } else {
      // สร้างกราฟใหม่ถ้ายังไม่มี
      tempChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels, // ข้อมูลวันที่หรือเวลา
          datasets: [{
            label: 'Temperature',
            data: temperatures, // ข้อมูลอุณหภูมิ
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: false,
          }],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Time'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Temperature (°C)'
              },
              min: 0,
              max: 50,
            }
          }
        }
      });
    }
  } else {
    document.getElementById('temperature').innerText = 'No data available.';
  }
}

// เรียกใช้ loadDashboard เมื่อเริ่มต้น
loadDashboard();

// เรียกใช้ loadDashboard ทุกๆ 10 วินาที
setInterval(loadDashboard, 30000);
