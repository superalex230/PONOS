const roomInput = document.getElementById("room");
const senderButton = document.getElementById("role-sender");
const receiverButton = document.getElementById("role-receiver");
const senderPanel = document.getElementById("sender-panel");
const receiverPanel = document.getElementById("receiver-panel");
const fileInput = document.getElementById("file");
const startStreamButton = document.getElementById("start-stream");
const fullscreenButton = document.getElementById("fullscreen");
const playerSection = document.getElementById("player");
const video = document.getElementById("video");

const state = {
  role: null,
  socket: null,
  peer: null,
  room: null,
  stream: null,
};

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function updateRole(role) {
  state.role = role;
  senderPanel.hidden = role !== "sender";
  receiverPanel.hidden = role !== "receiver";
  if (role === "receiver") {
    fullscreenButton.disabled = true;
  }
}

function ensureRoom() {
  const room = roomInput.value.trim();
  if (!room) {
    alert("Введите имя комнаты");
    return null;
  }
  return room;
}

function connectSocket(room) {
  if (state.socket) {
    return state.socket;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${window.location.host}`);
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "join", room }));
  });
  socket.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data);
    if (!state.peer) {
      return;
    }

    if (message.type === "offer" && state.role === "receiver") {
      await state.peer.setRemoteDescription(message.data);
      const answer = await state.peer.createAnswer();
      await state.peer.setLocalDescription(answer);
      socket.send(
        JSON.stringify({ type: "answer", data: state.peer.localDescription })
      );
    }

    if (message.type === "answer" && state.role === "sender") {
      await state.peer.setRemoteDescription(message.data);
    }

    if (message.type === "candidate") {
      try {
        await state.peer.addIceCandidate(message.data);
      } catch (error) {
        console.error("ICE error", error);
      }
    }
  });
  state.socket = socket;
  return socket;
}

function createPeerConnection(socket) {
  const peer = new RTCPeerConnection(iceServers);
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      socket.send(
        JSON.stringify({ type: "candidate", data: event.candidate })
      );
    }
  });
  peer.addEventListener("track", (event) => {
    const [stream] = event.streams;
    if (stream) {
      attachStream(stream);
    }
  });
  return peer;
}

function attachStream(stream) {
  state.stream = stream;
  video.srcObject = stream;
  playerSection.hidden = false;
  fullscreenButton.disabled = false;
  video.play().catch(() => null);
}

async function startSenderFlow(file) {
  const room = ensureRoom();
  if (!room) {
    return;
  }
  const socket = connectSocket(room);
  const peer = createPeerConnection(socket);
  state.peer = peer;
  state.room = room;

  const fileUrl = URL.createObjectURL(file);
  video.src = fileUrl;
  await video.play();
  const stream = video.captureStream();
  for (const track of stream.getTracks()) {
    peer.addTrack(track, stream);
  }
  attachStream(stream);

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.send(JSON.stringify({ type: "offer", data: peer.localDescription }));
}

async function startReceiverFlow() {
  const room = ensureRoom();
  if (!room) {
    return;
  }
  const socket = connectSocket(room);
  const peer = createPeerConnection(socket);
  state.peer = peer;
  state.room = room;
}

senderButton.addEventListener("click", () => {
  updateRole("sender");
});

receiverButton.addEventListener("click", () => {
  updateRole("receiver");
  startReceiverFlow();
});

fileInput.addEventListener("change", () => {
  startStreamButton.disabled = !fileInput.files?.length;
});

startStreamButton.addEventListener("click", async () => {
  if (!fileInput.files?.length) {
    return;
  }
  await startSenderFlow(fileInput.files[0]);
});

fullscreenButton.addEventListener("click", () => {
  if (video.requestFullscreen) {
    video.requestFullscreen();
  }
});
