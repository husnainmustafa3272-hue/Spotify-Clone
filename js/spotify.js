console.log("Spotify Clone JS Loaded");

let currentSong = new Audio();
let songs = [];
let artists = [];
let currFolder = "";
let currentSongIndex = 0;

const playBtn = document.getElementById("play");
const previousBtn = document.getElementById("previous");
const nextBtn = document.getElementById("next");

// UTILS
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

// PLAY MUSIC - SIMPLIFIED
function playMusic(track, pause = false) {
    // Clean track name
    const cleanTrack = track.trim();

    // Construct path - IMPORTANT: No leading dot
    const path = `songs/${currFolder}/${cleanTrack}`;
    console.log("Playing from path:", path);

    // Set source
    currentSong.src = path;

    // Error handling
    currentSong.onerror = function () {
        console.error("Failed to load audio:", path);
        document.querySelector(".songinfo").innerText = "Error loading song";
        document.querySelector(".songtime").innerText = "00:00 / 00:00";
        playBtn.src = "img/play.svg";
    };

    // Success
    currentSong.oncanplaythrough = function () {
        console.log("Audio loaded successfully:", cleanTrack);
    };

    if (!pause) {
        currentSong.play()
            .then(() => {
                console.log("Now playing:", cleanTrack);
                playBtn.src = "img/pause.svg";
            })
            .catch(error => {
                console.error("Playback error:", error);
                playBtn.src = "img/play.svg";
            });
    }

    // Update UI
    const songTitle = cleanTrack.replace(".mp3", "");
    document.querySelector(".songinfo").innerText = songTitle;
    document.querySelector(".songtime").innerText = "00:00 / 00:00";

    // Update current song index
    currentSongIndex = songs.indexOf(track);

    // Highlight current song in playlist
    highlightCurrentSong();
}

// Highlight current song in playlist
function highlightCurrentSong() {
    const songItems = document.querySelectorAll(".songList ul li");
    songItems.forEach((item, index) => {
        if (index === currentSongIndex) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
}

// LOAD PLAYLIST
async function loadPlaylist(folder) {
    try {
        const res = await fetch("songs.json");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const albums = await res.json();
        const album = albums.find(a => a.folder === folder);

        if (!album) {
            console.error("Album not found:", folder);
            return;
        }

        songs = album.songs.map(s => s.name);
        artists = album.songs.map(s => s.artist);
        currFolder = album.folder;

        console.log("Loaded playlist:", album.title);
        console.log("Songs:", songs);

        const songUL = document.querySelector(".songList ul");
        songUL.innerHTML = "";

        songs.forEach((song, i) => {
            const songName = song.replace(".mp3", "");
            songUL.innerHTML += `
            <li data-index="${i}">
                <img class="invert" width="34" src="img/music.svg" alt="music">
                <div class="info">
                    <div class="song-title">${songName}</div>
                    <div class="artist">${artists[i]}</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                </div>
            </li>`;
        });

        // Add click events to songs
        Array.from(songUL.children).forEach(li => {
            li.addEventListener("click", () => {
                const index = parseInt(li.dataset.index);
                currentSongIndex = index;
                playMusic(songs[index]);
            });
        });

        // Load first song
        if (songs.length > 0) {
            currentSongIndex = 0;
            playMusic(songs[0], true);
        }

    } catch (error) {
        console.error("Error loading playlist:", error);
    }
}

// DISPLAY ALBUMS
async function displayAlbums() {
    try {
        const res = await fetch("songs.json");
        if (!res.ok) throw new Error(`Failed to load albums: ${res.status}`);

        const albums = await res.json();
        console.log("Found albums:", albums.length);

        const cardContainer = document.querySelector(".cardContainer");
        const footer = cardContainer.querySelector("footer");

        // Clear any existing cards before footer
        const existingCards = cardContainer.querySelectorAll(".card");
        existingCards.forEach(card => {
            if (card !== footer && !card.contains(footer)) {
                card.remove();
            }
        });

        albums.forEach((album) => {
            const card = document.createElement("div");
            card.className = "card";
            card.dataset.folder = album.folder;

            card.innerHTML = `
                <div class="play">▶</div>
                <img src="songs/${album.folder}/cover.jpg" alt="${album.title}" 
                     onerror="this.onerror=null; this.src='img/default-cover.jpg'">
                <h2>${album.title}</h2>
                <p>${album.description}</p>
            `;

            cardContainer.insertBefore(card, footer);
        });

        // Add click events to album cards
        cardContainer.querySelectorAll(".card").forEach(card => {
            if (card.dataset.folder) {
                card.addEventListener("click", () => {
                    loadPlaylist(card.dataset.folder);
                });
            }
        });

        // Load first album by default
        if (albums.length > 0) {
            loadPlaylist(albums[0].folder);
        }

    } catch (error) {
        console.error("Error displaying albums:", error);
    }
}

// MAIN FUNCTION
async function main() {
    console.log("Initializing Spotify Clone...");

    // Check if files exist
    console.log("Checking songs.json...");
    try {
        const res = await fetch("songs.json");
        console.log("songs.json status:", res.ok ? "OK" : "Failed");
    } catch (e) {
        console.error("Cannot load songs.json:", e);
    }

    await displayAlbums();

    // Play/Pause button
    playBtn.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
                .then(() => {
                    playBtn.src = "img/pause.svg";
                })
                .catch(error => {
                    console.error("Play failed:", error);
                });
        } else {
            currentSong.pause();
            playBtn.src = "img/play.svg";
        }
    });

    // Time update
    currentSong.addEventListener("timeupdate", () => {
        if (!isNaN(currentSong.duration) && currentSong.duration > 0) {
            document.querySelector(".songtime").innerText =
                `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;

            const progressBar = document.querySelector(".circle");
            if (progressBar && currentSong.duration > 0) {
                const percentage = (currentSong.currentTime / currentSong.duration) * 100;
                progressBar.style.left = `${percentage}%`;
            }
        }
    });

    // Seekbar click
    document.querySelector(".seekbar").addEventListener("click", e => {
        if (currentSong.duration && currentSong.duration > 0) {
            const percent = (e.offsetX / e.target.clientWidth);
            currentSong.currentTime = currentSong.duration * percent;
        }
    });

    // Previous button
    previousBtn.addEventListener("click", () => {
        if (songs.length > 0) {
            currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
            playMusic(songs[currentSongIndex]);
        }
    });

    // Next button
    nextBtn.addEventListener("click", () => {
        if (songs.length > 0) {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            playMusic(songs[currentSongIndex]);
        }
    });

    // Volume control
    const volumeSlider = document.querySelector(".range input");
    if (volumeSlider) {
        currentSong.volume = volumeSlider.value / 100;
        volumeSlider.addEventListener("input", e => {
            currentSong.volume = e.target.value / 100;
        });
    }

    // Song ended - play next
    currentSong.addEventListener("ended", () => {
        if (songs.length > 0) {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            playMusic(songs[currentSongIndex]);
        }
    });

    // Hamburger menu
    const hamburger = document.querySelector(".hamburger");
    const closeBtn = document.querySelector(".close");
    const leftPanel = document.querySelector(".left");

    if (hamburger && leftPanel) {
        hamburger.addEventListener("click", () => {
            leftPanel.style.left = "0";
        });
    }

    if (closeBtn && leftPanel) {
        closeBtn.addEventListener("click", () => {
            leftPanel.style.left = "-120%";
        });
    }
    
}

// Initialize
document.addEventListener("DOMContentLoaded", main);