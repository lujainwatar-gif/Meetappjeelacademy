// خادم الإشارات: يعرّف المشاركين ببعضهم ويمرّر رسائل WebRTC بينهم
// الفيديو والصوت لا يمرّان من هنا، بل مباشرة بين المتصفحات
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  // الانضمام إلى غرفة
  socket.on('join', ({ room, name }) => {
    socket.data.room = room;
    socket.data.name = name || 'مشارك';

    // قائمة من هم في الغرفة الآن (قبل انضمام هذا الشخص)
    const existing = [...(io.sockets.adapter.rooms.get(room) || [])].map((id) => ({
      id,
      name: io.sockets.sockets.get(id)?.data.name || 'مشارك',
    }));

    socket.join(room);
    socket.emit('peers', existing);
  });

  // تمرير رسائل الاتصال (عرض، رد، مرشحات ICE) إلى مشارك محدد
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, name: socket.data.name, data });
  });

  // الدردشة النصية
  socket.on('chat', (text) => {
    const { room, name } = socket.data;
    if (!room || typeof text !== 'string') return;
    io.to(room).emit('chat', { name, text: text.slice(0, 1000) });
  });

  // المغادرة
  socket.on('disconnect', () => {
    if (socket.data.room) socket.to(socket.data.room).emit('peer-left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`يعمل على: http://localhost:${PORT}`));
