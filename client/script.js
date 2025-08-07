const serverUrl = "http://localhost:3001";
const socket = io(serverUrl);
let currentVideo = null;

function uploadVideo() {
  const username = document.getElementById("username").value;
  const title = document.getElementById("videoTitle").value;
  const file = document.getElementById("videoFile").files[0];

  const formData = new FormData();
  formData.append("user", username);
  formData.append("title", title);
  formData.append("video", file);

  fetch(serverUrl + "/upload", { method: "POST", body: formData })
    .then(res => res.json())
    .then(video => addVideoToFeed(video));
}

function loadVideos() {
  fetch(serverUrl + "/videos")
    .then(res => res.json())
    .then(videos => videos.forEach(addVideoToFeed));
}

function addVideoToFeed(video) {
  const feed = document.getElementById("videoFeed");
  const container = document.createElement("div");
  container.innerHTML = `<strong>${video.title}</strong> by ${video.user}
    <br><video src="${serverUrl}/${video.url}" width="320" controls></video>`;
  container.onclick = () => showComments(video);
  feed.prepend(container);
}

function showComments(video) {
  currentVideo = video;
  document.getElementById("commentsSection").style.display = "block";
  document.getElementById("selectedVideoTitle").textContent = video.title;
  document.getElementById("selectedVideoPlayer").src = serverUrl + "/" + video.url;

  fetch(`${serverUrl}/comments/${video._id}`)
    .then(res => res.json())
    .then(comments => {
      const list = document.getElementById("commentsList");
      list.innerHTML = "";
      comments.forEach(c => {
        const p = document.createElement("p");
        p.innerHTML = `<b>${c.user}</b>: ${c.text}`;
        list.appendChild(p);
      });
    });
}

function postComment() {
  const text = document.getElementById("newComment").value;
  const user = document.getElementById("username").value;

  fetch(serverUrl + "/comment", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId: currentVideo._id, user, text })
  });

  document.getElementById("newComment").value = "";
}

socket.on("new_video", addVideoToFeed);
socket.on("new_comment", comment => {
  if (currentVideo && comment.videoId === currentVideo._id) {
    const p = document.createElement("p");
    p.innerHTML = `<b>${comment.user}</b>: ${comment.text}`;
    document.getElementById("commentsList").appendChild(p);
  }
});

loadVideos();
