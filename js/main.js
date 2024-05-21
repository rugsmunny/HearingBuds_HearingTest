const $ = document.querySelector.bind(document);
const $all = document.querySelectorAll.bind(document);
const hearingTestContainer = $("#hearing-test-container");

// PAGES -- SLIDES

function getWelcomeSlide() {
  hearingTestContainer.innerHTML = SLIDE_1;
  $(".nav-button").addEventListener("click", (event) => navigate(event));
  resetTestValues();
}

function getFormSlide() {
  hearingTestContainer.innerHTML = SLIDE_2;

  const birthYear = $("#birth-year");
  const birthYearDropdown = birthYear.querySelector(".dropdown-wrapper");
  const birthYearDropdownList = birthYear.querySelector(".dropdown-content");

  populateYearOfBirthDropdown(birthYearDropdownList);
  birthYearDropdown.addEventListener("click", (event) => {
    event.stopPropagation();
    $("#birth-year").classList.toggle("on-hover");
  });

  const gender = $all(".input-radio");
  gender.forEach((radioButton) =>
    radioButton.addEventListener("click", (event) => {
      validateForm(event);
      USER_DATA.gender = radioButton.id || "";
    })
  );

  $all(".input-checkbox").forEach((checkbox) =>
    checkbox.addEventListener("click", () => {
      if (checkbox.id === "other") {
        $("#text-field").classList.toggle("hidden");
      }
      validateForm();
    })
  );
  $(".x-icon").addEventListener("click", () => {
    $("#tell-us-more-about-it").value = "";
  });

  $(".nav-button").addEventListener("click", (event) => {
    if ($(".nav-button").classList.contains("inactive")) {
      return;
    }
    USER_DATA.yearOfBirth = $("#year-selected").textContent;

    $all(".input-checkbox").forEach((checkbox) => {
      const key = checkbox.id.includes("-")
        ? dashIdToCamelCase(checkbox.id)
        : checkbox.id;
      USER_DATA.difficulties[key] = checkbox.checked;
      if (checkbox.id === "other" && checkbox.checked) {
        USER_DATA.difficulties[key] = $("#tell-us-more-about-it").value;
      }
    });
    navigate(event);
  });
}

function dashIdToCamelCase(id) {
  return id.replace(/-(.)/g, (_, char) => char.toUpperCase());
}

let withHeadphones = false;

async function getCalibrationSlide() {
  await getCalibrationSlideHTML();
  $all(".btn").forEach((button) =>
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      switch (event.currentTarget.id) {
        case "with":
        case "without":
          if (!audio.paused) {
            audio.pause();
          }
          withHeadphones = event.currentTarget.id === "with";
          const textToDisplay = `${
            withHeadphones
              ? initialTestTextWithHeadphones
              : initialTestTextWithoutHeadphones
          }${testDescription}`;
          const datadirection = withHeadphones ? 4 : 3;
          setSoundTestDialogHTML(textToDisplay, datadirection);
          displayModal();
          break;
        case "play":
          const calibrationButton = event.currentTarget;
          const playPauseIcons = calibrationButton.querySelectorAll("div svg");

          if (!audio.paused) {
            audio.pause();
            return;
          }
          playPauseIcons.forEach((svg) =>
            svg.classList.toggle("non-displayed")
          );
          await playback(0, "resources/sounds/Mono/DoroCalibrated.mp3");
          playPauseIcons.forEach((svg) =>
            svg.classList.toggle("non-displayed")
          );
          break;
        case "back":
          navigate(event);
          break;
        default:
          break;
      }
    })
  );
}

async function getSoundTestSlide(hearingTestType, earText, datadirection, pan) {
  await getSoundTestSlideHTML(hearingTestType, earText, datadirection);

  $all(".soundtrack-button").forEach((button) =>
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!audio.paused) {
        audio.pause();
      }
      if (button.classList.contains("test-finished")) {
        currentSound = sounds[0];
        resultIndex++;
        navigate(event);
      } else {
        changeSoundTrack(button);
        const decibelValue = USER_DATA.testResults[withHeadphones][resultIndex];
        initiateAndRunPlayback(decibelValue);
        updateTrackbar(decibelValue);
      }
    })
  );

  const volumeButtons = $all(".volume-button");
  volumeButtons.forEach((button) =>
    button.addEventListener("click", (event) => {
      let value =
        +event.currentTarget.getAttribute("value") +
        +$(".trackbar-marker").getAttribute("value");
      if (value < 0) value++;
      if (value > 5) value--;
      updateTrackbar(value);
      initiateAndRunPlayback(value);
      volumeButtons.forEach(
        (button) => (button.querySelector("path").style.fill = "#748C80")
      );
    })
  );
  const trackBars = $all(".track");
  Array.from(trackBars).forEach((trackBar) =>
    trackBar.addEventListener("click", (event) => {
      const mouseX = event.clientX;
      const trackRect = event.currentTarget.getBoundingClientRect();
      const trackWidth = trackRect.width;
      const position = Math.round((mouseX - trackRect.left) / (trackWidth / 5));
      updateTrackbar(position);
      initiateAndRunPlayback(position);
      volumeButtons.forEach(
        (button) => (button.querySelector("path").style.fill = "#748C80")
      );
    })
  );

  function detectMobile() {
    var result = navigator.userAgent.match(
      /(iphone)|(ipod)|(ipad)|(android)|(blackberry)|(windows phone)|(symbian)/i
    );

    if (result !== null) {
      return "mobile";
    } else {
      return "desktop";
    }
  }
  const trackMarkers = $all(".trackbar-marker");
  trackMarkers.forEach((trackMarker) => {
    trackMarker.addEventListener("mousedown", () => {
      const trackBar = trackMarker.parentElement;
      const trackRect = trackBar.getBoundingClientRect();
      const trackWidth = trackRect.width;

      const mouseMoveHandler = (event) => {
        event.preventDefault();
        let mouseX;
        if (detectMobile() == "desktop") {
          mouseX = event.pageX;
        } else {
          mouseX = event.touches[0].pageX;
        }
        const newPosition = Math.min(
          Math.max(mouseX - trackRect.left, -10),
          trackWidth
        );
        if (newPosition >= 0 && newPosition <= trackWidth) {
          trackMarker.style.left = `${newPosition - (trackMarker.getBoundingClientRect().width/2)}px`;
          trackBar.style.backgroundImage = `linear-gradient(to right, #008545 ${newPosition}px, #333F48 ${newPosition}px)`;
        }
      };

      const mouseUpHandler = () => {
        const position = Math.round((trackMarker.getBoundingClientRect().left - trackRect.left) / (trackWidth / 5));
        updateTrackbar(position);
        initiateAndRunPlayback(position);

        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    });
  });

  function initiateAndRunPlayback(decibelValue) {
    decibel = decibelBValues[decibelValue];
    USER_DATA.testResults[withHeadphones][resultIndex] = decibelValue;
    playback(
      pan,
      `resources/sounds/Mono/Doro_${currentSound}_${decibel}dB_mono.mp3`
    ).then(() => {
      volumeButtons.forEach(
        (button) => (button.querySelector("path").style.fill = "#008545")
      );
    });
  }

  $("#restart").addEventListener("click", (event) => {
    event.preventDefault();
    setRestartTestModal();
    displayModal();
  });

  initiateAndRunPlayback(4); // start playback at 45dB as soon as page has finish loading
}

async function setResultSlide() {
  const testResults = USER_DATA.testResults[withHeadphones];
  let title = "";
  let text = "";

  if (testResults.every((value) => value === 5)) {
    title = alarmingResultsTitle;
    text = alarmingResultsText;
  } else if (testResults.every((value) => value < 2)) {
    title = hearingbudsMayNotHelpTitle;
    text = hearingbudsMayNotHelpText;
  } else {
    title = hearingbudsMayHelpTitle;
    text = hearingbudsMayHelpText;
  }
  await getResultSlide(title, text);
  $("#to-webshop").addEventListener("click", () => {
    window.location.href = STORE_URL;
  });
  $("#restart").addEventListener("click", (event) => {
    event.preventDefault();
    setRestartTestModal();
    displayModal();
  });
}

// FORM AND USER DATA

const USER_DATA = {
  yearOfBirth: "",
  gender: "",
  difficulties: {
    noisyEnvironments: false,
    tvRadio: false,
    talkingToPeople: false,
    other: false,
    no: false,
  },
  testResults: {
    true: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    false: [4, 4, 4, 4, 4],
  },
};

// FORM HELPERS

function validateForm() {
  const birthYearSelected =
    $("#year-selected").textContent.trim() !== "Pick your birth year";
  const atLeastOneRadioChecked = Array.from($all(".gender")).some(
    (radioButton) => radioButton.checked
  );
  const atLeastOneCheckboxChecked = Array.from($all(".difficulties")).some(
    (checkbox) => checkbox.checked
  );

  if (
    birthYearSelected &&
    atLeastOneRadioChecked &&
    atLeastOneCheckboxChecked
  ) {
    $(".nav-button").classList.remove("inactive");
  } else {
    $(".nav-button").classList.add("inactive");
  }
}

function populateYearOfBirthDropdown(yearOfBirth) {
  const currentYear = new Date().getFullYear();
  for (var year = currentYear; year >= currentYear - 120; year--) {
    const birthYear = document.createElement("p");
    birthYear.classList.add("text");
    birthYear.style.textAlign = "end";
    birthYear.textContent = year;
    birthYear.addEventListener("click", () => {
      $("#year-selected").textContent = birthYear.textContent;
      validateForm();
    });
    yearOfBirth.appendChild(birthYear);
  }
}

// NAVIGATION

const actions = {
  0: () => getWelcomeSlide(),
  1: () => getFormSlide(),
  2: () => getCalibrationSlide(),
  3: () =>
    getSoundTestSlide(
      setEarTestTypeHtml(2, "both-ears", "Both ears"),
      "ears",
      6,
      0
    ), //both ears
  4: () =>
    getSoundTestSlide(
      setEarTestTypeHtml(1, "left-ear", "Left ear"),
      "left ear",
      5,
      -1
    ), //left ear
  5: () =>
    getSoundTestSlide(
      setEarTestTypeHtml(1, "right-ear", "Right ear"),
      "right ear",
      6,
      1
    ), // right ear
  6: () => setResultSlide(),
};

function navigate(event) {
  event.preventDefault();
  const buttonClicked = event.currentTarget;
  if (buttonClicked.classList.contains("inactive")) {
    return;
  }
  if (!audio.paused) {
    audio.pause();
  }
  buttonClicked.removeEventListener("click", navigate);
  changeSlide(buttonClicked.getAttribute("data-direction"));
}

function changeSlide(slideToGet) {
  hearingTestContainer.classList.add("fade-out");
  setTimeout(() => {
    actions[slideToGet]();
    hearingTestContainer.classList.remove("fade-out");
    hearingTestContainer.classList.add("fade-in");
  }, 600);
}

// PLAYBACK


const sounds = ["1kHz", "500Hz", "2kHz", "4kHz", "8kHz"]; // order of sounds
const decibelBValues = [0, 15, 25, 35, 45, 55]; // order of decibels
let currentSound = sounds[0]; // start value
let decibel = decibelBValues[4]; // start value

const audio = new Audio();
let audioContext;
let stereoNode;
let source;

async function playback(pan, audioSrc) {
  if (!audio.paused) {
    audio.pause();
  }
  if (!audioContext) {
    audioContext = new AudioContext();
    stereoNode = new StereoPannerNode(audioContext);
    source = audioContext.createMediaElementSource(audio);
    source.connect(stereoNode).connect(audioContext.destination);
  }

  audio.src = audioSrc;
  stereoNode.pan.value = pan;

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      resolve();
    };
    audio.onpause = () => {
      resolve();
    };
    audio.play().catch((error) => {
      reject(error);
    });
  });
}

function updateTrackbar(trackbarValue) {
  const markers = $all(".trackbar-marker");
  Array.from(markers).forEach((marker) => {
    marker.setAttribute("value", trackbarValue);
    marker.style.left = `calc((100% / 5) * ${trackbarValue} - 1.5rem)`;
  });
  const trackBars = $all(".track");
  Array.from(trackBars).forEach(
    (trackBar) =>
      (trackBar.style.backgroundImage = `linear-gradient(to right, #008545 calc((100% / 5) * ${trackbarValue} - 1.4rem), #333F48 0%)`)
  );
}

let resultIndex = 0;

function changeSoundTrack(button) { 
  const currentSoundDisplay = $("#sound-test-iteration");
  const directionChange = +button.getAttribute("value");
  const currentSoundNumber =
    +parseInt(currentSoundDisplay.textContent) + directionChange;

  if (currentSoundNumber < 1 || currentSoundNumber > 5) {
    return;
  }

  currentSound = sounds[currentSoundNumber - 1];
  resultIndex += directionChange;
  currentSoundDisplay.textContent = currentSoundNumber;
  const nextSoundBtn = $("#next-sound");
  if(currentSoundNumber == 5) {
    nextSoundBtn.querySelector("p").textContent = "Finish test";
    nextSoundBtn.classList.add("test-finished");
  } else {
    nextSoundBtn.querySelector("p").textContent = "Next sound";
    nextSoundBtn.classList.remove("test-finished");
  }
  

  $("#previous-sound").style.visibility =
    currentSoundDisplay.textContent > 1 ? "visible" : "hidden";
}

// MODAL / DIALOG

function displayModal() {
  $("#dialog").showModal();
  $("#dialog-close-btn").addEventListener("click", () => $("#dialog").close());
  $("#start-hearing-test").addEventListener("click", (event) => {
    if (!audio.paused) {
      audio.pause();
    }
    navigate(event);
  });
}

// RESTART TEST

function resetTestValues() {
  USER_DATA.yearOfBirth = "";
  USER_DATA.gender = "";
  USER_DATA.difficulties.noisyEnvironments = false;
  USER_DATA.difficulties.tvRadio = false;
  USER_DATA.difficulties.talkingToPeople = false;
  USER_DATA.difficulties.other = false;
  USER_DATA.difficulties.no = false;
  USER_DATA.testResults.true = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  USER_DATA.testResults.false = [4, 4, 4, 4, 4];
  resultIndex = 0;
}

// CHECK FOR DESKTOP OR MOBILE

function detectMobile() {
  var result = navigator.userAgent.match(
    /(iphone)|(ipod)|(ipad)|(android)|(blackberry)|(windows phone)|(symbian)/i
  );

  if (result !== null) {
    return "mobile";
  } else {
    return "desktop";
  }
}

function onMouseMove(event) {
  if (detectMobile() == "desktop") {
    return event.pageX;
  }
  return event.touches[0].pageX;
}

// STORE URL
const STORE_URL =
  "https://www.doro.com/sv-se/shop/smart-devices/hearingbuds/doro-hearingbuds/";
// Texts
const testDescription = `, each playing the same sound at a different frequency.<br><br>Adjust each slider to increase or decrease the volume level until you can barely hear the sound on that slider.`;
const initialTestTextWithHeadphones =
  "For both left and right ear, there are 5 sliders";
const initialTestTextWithoutHeadphones = "There are 5 sliders";
const hearingbudsMayHelpTitle = "The HearingBuds may help";
const hearingbudsMayHelpText =
  "Your test results show that you have mild to moderate hearing loss in both ears across different frequencies.";
const hearingbudsMayNotHelpTitle = "Your hearing sensitivity is within normal range across all frequencies tested.";
const hearingbudsMayNotHelpText =
  "Based on your online hearing test results, we recommend our HearingBuds for its excellent sound performance during calls and listening to music.";
const alarmingResultsTitle =
  "Attention: You may want to seek professional help.";
const alarmingResultsText = `Your test results show that you have severe hearing loss in both ears across different frequencies. We recommend you seek professional help.`;
const abortTestWarningText = `If you restart this test you will lose all your progress.`;

// HTML TEST TYPES

function setEarTestTypeHtml(numOfEars, className, text) {
  let htmlToReturn = `<span class="${className}">`;
  while (numOfEars > 0) {
    htmlToReturn += ` <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <path
        d="M34 40.78C33.42 40.78 32.88 40.66 32.48 40.48C31.06 39.74 30.06 38.72 29.06 35.72C28.04 32.6 26.12 31.14 24.28 29.72C22.7 28.5 21.06 27.24 19.64 24.66C18.58 22.74 18 20.64 18 18.78C18 13.18 22.4 8.77997 28 8.77997C33.6 8.77997 38 13.18 38 18.78H42C42 10.92 35.86 4.77997 28 4.77997C20.14 4.77997 14 10.92 14 18.78C14 21.3 14.76 24.08 16.14 26.58C17.96 29.88 20.1 31.54 21.84 32.88C23.46 34.12 24.62 35.02 25.26 36.98C26.46 40.62 28 42.66 30.72 44.08C31.74 44.54 32.86 44.78 34 44.78C38.42 44.78 42 41.2 42 36.78H38C38 38.98 36.2 40.78 34 40.78ZM15.28 6.05997L12.44 3.21997C8.46 7.19997 6 12.7 6 18.78C6 24.86 8.46 30.36 12.44 34.34L15.26 31.52C12.02 28.26 10 23.76 10 18.78C10 13.8 12.02 9.29997 15.28 6.05997ZM23 18.78C23 21.54 25.24 23.78 28 23.78C30.76 23.78 33 21.54 33 18.78C33 16.02 30.76 13.78 28 13.78C25.24 13.78 23 16.02 23 18.78Z"
        fill="#008545" />
    </svg>`;
    numOfEars--;
  }
  return `${htmlToReturn}<br class="line-break"><p>${text}</p></span>`;
}

// HTML TEMPLATES
const SLIDE_1 = `
<img src="resources/images/hero/hero-image.png" alt="Hero Image" class="hero-image">
        <img src="resources/images/hero/hero-image-mobile.png" alt="Hero Image Mobile" class="hero-image-mobile">
        <div id="welcome">
            <h1 class="title">Doro HearingBuds <br class="line-break"> Hearing Test</h1>
            <section>

                <p class="bread">Welcome to our Online <br class="line-break">Hearing Test!</p><p class="bread">Discover
                if the Doro
                HearingBuds could be beneficial for you</p>
            </section>
            
            <button class="nav-button" data-direction="1">
                Start the test
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="white" />
                </svg>
            </button>
        </div>

        <footer class="disclaimer">
            <p>
                DISCLAIMER: This test is not intended to diagnose hearing loss. It is only meant to provide an indicator
                to help determine if the Doro HearingBuds may be helpful for you. For a comprehensive assessment, please
                consult a specialist.
            </p>
        </footer>`;

const SLIDE_2 = `
<div id="user-info"> 
            <h1 class="title">First tell us a little <br class="line-break"> about yourself</h1>
            <section id="birth-year">
                <p>Please select your year of birth?</p>
                <div class="dropdown-wrapper">
                    <div class="year-dropdown">
                        <span id="year-selected">Pick your birth year</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M2 7.5L12 17.5L22 7.5H2Z" fill="#008545" />
                        </svg>
                    </div>
                    <div class="dropdown-content"></div>
                </div>
            </section>

            <section id="gender">
                <p>Pick your gender</p>
      
                <ul id="gender-radio-option">

                    <li class="radio-item">
                        <input type="radio" id="male" name="gender" class="input-radio gender">
                        <label for="male">Male</label>
                    </li>
                    <li class="radio-item">
                        <input type="radio" id="female" name="gender" class="input-radio gender">
                        <label for="female">Female</label>
                    </li>
                    <li class="radio-item">
                        <input type="radio" id="no-answer" name="gender" class="input-radio gender">
                        <label for="no-answer">Prefer not to answer</label>
                    </li>
                </ul>
            </section>

        

            <section id="hearing-difficulties">
                <p>Are there any situations where you've noticed you have difficulty hearing?
                </p>
                <ul class="checkbox-list">
                    <li>
                        <input type="checkbox" id="noisy-environments" name="noisy-environments"
                            class="input-checkbox difficulties">
                        <label for="noisy-environments">Noisy environments (restaurants etc.)</label>
                    </li>
                    <li>
                        <input type="checkbox" id="tv-radio" name="tv-radio" class="input-checkbox difficulties">
                        <label for="tv-radio">Watching TV/Radio</label>
                    </li>
                    <li>
                        <input type="checkbox" id="talking-to-people" name="talking-to-people"
                            class="input-checkbox difficulties">
                        <label for="talking-to-people">Talking to people</label>
                    </li>
                    <li>
                        <div class="text-area-wrapper">

                            <input type="checkbox" id="other" name="other" class="input-checkbox difficulties">
                            <label for="other">Other</label>

                            <div id="text-field" class="text-field hidden">
                                <input type="text" name="tell-us-more" id="tell-us-more-about-it"
                                    placeholder="Tell us more about it...">
                                <div class="x-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                        fill="none">
                                        <path fill-rule="evenodd" clip-rule="evenodd"
                                            d="M12 2C6.47 2 2 6.47 2 12C2 17.53 6.47 22 12 22C17.53 22 22 17.53 22 12C22 6.47 17.53 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12 10.59L15.59 7L17 8.41L13.41 12L17 15.59L15.59 17L12 13.41L8.41 17L7 15.59L10.59 12L7 8.41L8.41 7L12 10.59Z"
                                            fill="#333F48" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li>
                        <input type="checkbox" id="no" name="no" class="input-checkbox difficulties">
                        <label for="no">No</label>
                    </li>
                </ul>

          

                <p>This information will only be used internally by Doro to calculate the
                    results of your test.</p>
            </section>

        

            <button class="nav-button inactive" data-direction="2">
                Next
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="white" />
                </svg>
            </button>

            <div class="progress-bar">
                <div class="page-number">1/4</div>
                <progress value="1" max="4"></progress>
            </div>
        </div>`;

async function getCalibrationSlideHTML() {
  hearingTestContainer.innerHTML = `
  <section id="calibration">

              <h1 class="title">Calibrate your <br class="line-break"> sound levels</h1>

              <div class="grey-container important">
                  <span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
                      <path
                          d="M18 5.625C10.5398 5.625 4.3875 11.2078 3.4875 18.4219C4.14844 18.1547 4.86562 18 5.625 18C7.48828 18 9 19.5117 9 21.375V30.375C9 32.2383 7.48828 33.75 5.625 33.75C2.51719 33.75 0 31.2328 0 28.125V27V23.625V20.25C0 10.3078 8.05781 2.25 18 2.25C27.9422 2.25 36 10.3078 36 20.25V23.625V27V28.125C36 31.2328 33.4828 33.75 30.375 33.75C28.5117 33.75 27 32.2383 27 30.375V21.375C27 19.5117 28.5117 18 30.375 18C31.1344 18 31.8516 18.1477 32.5125 18.4219C31.6125 11.2078 25.4602 5.625 18 5.625Z"
                          fill="#008545" />
                  </svg>
                  <p class="inter-bold">Important</p>
                  </span>
                  
  
                  <p>
                      We recommend you perform this entire test with headphones or some kind of headset on, to get the
                      most accurate results.
                  </p>
              </div>
  
              <section class="info-container">
  
                  <div class="info">
                      <span>
                           <p class="inter-bold">
                          In a silent room and with headphones on:
                      </p>
                      <p>
                          Play the test sound file by clicking the button below.
                      </p>
                      <ol>
                          <li>
                              <p>
                                  Remove your headphones and rub your hands together quickly
                                  and firmly in front of your nose to try to make the same
                                  sound.
                              </p>
                          </li>
                          <li>
                              <p>
                                  Adjust your volume so that the test sound file volume
                                  matches the sound of your own hands.
                              </p>
                          </li>
                      </ol>
                      </span>
                     
  
                      <div id="play" class="calibrate-button btn">
  
                          <div class="play-button">
  
                              <svg class="non-displayed" width="73" height="73" viewBox="5 0 63 63" fill="#fff"
                                  xmlns="http://www.w3.org/2000/svg">
                                  <path id="Vector" d="M19 47H27.6667V16H19V47ZM36.3333 16V47H45V16H36.3333Z"
                                      fill="#fff" />
                              </svg>
  
                              <svg xmlns="http://www.w3.org/2000/svg" width="73" height="73" viewBox="0 0 63 63"
                                  fill="#fff">
                                  <path
                                      d="M21.6675 16.0546C19.6703 14.7837 17.0569 16.2183 17.0569 18.5856V44.3931C17.0569 46.7604 19.6703 48.195 21.6675 46.9241L41.9449 34.0203C43.7974 32.8415 43.7974 30.1372 41.9449 28.9584L21.6675 16.0546Z"
                                      fill="#fff" />
                              </svg>
  
                          </div>
                          <span>
                              <p>Play test sound</p>
                          </span>
  
  
                      </div>
  
                  </div>
  
  
                      <img class="hand-rub" src="resources/images/icons/rub-hands.svg" />
  
  
              </section>
  
              <section class="nav-container">

              <button id="back" class="nav-button back btn" data-direction="1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="white" />
                  </svg>
                  Back
              </button>

              <div class="inner-headphone-container">
                  <button id="without" class="nav-button btn" data-direction="3">Test without headphones</button>
                  <button id="with" class="nav-button btn without-headphones" data-direction="3">Test with headphones</button>
              </div>

          </section>
  
              <div class="progress-bar">
                  <div class="page-number">2/4</div>
                  <progress value="2" max="4"></progress>
              </div>
  
          </section>
  
          <dialog id="dialog"></dialog>`;
}

function setSoundTestDialogHTML(text, datadirection) {
  hearingTestContainer.querySelector("#dialog").innerHTML = `
  <span> <h2 class="title">This is how the test will work</h2>   <a href="https://developer.mozilla.org/es/docs/Web/CSS/::backdrop" target="_blank"></a>
    <button id="dialog-close-btn" aria-label="close" class="x"><svg class="dialog-x" width="40" height="40"
            viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M31.6668 10.6833L29.3168 8.33331L20.0002 17.65L10.6835 8.33331L8.3335 10.6833L17.6502 20L8.3335 29.3166L10.6835 31.6666L20.0002 22.35L29.3168 31.6666L31.6668 29.3166L22.3502 20L31.6668 10.6833Z" />
        </svg></button></span>
    
    <p id="dialog-text">${text}</p>

    <div class="nav-container button" id="start-hearing-test" data-direction="${datadirection}">
        <section class="nav-button">
            <div>
                <p>
                    Start hearing test
                </p>
            </div>
        </section>
    </div>
    `;
}

function setRestartTestModal() {
  hearingTestContainer.querySelector("#dialog").innerHTML = `
  <span><p id="dialog-text" style="text-align: center;">${abortTestWarningText}</p>
    <a href="https://developer.mozilla.org/es/docs/Web/CSS/::backdrop" target="_blank"></a>
    <button id="dialog-close-btn" aria-label="close" class="x"><svg class="dialog-x" width="40" height="40"
            viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M31.6668 10.6833L29.3168 8.33331L20.0002 17.65L10.6835 8.33331L8.3335 10.6833L17.6502 20L8.3335 29.3166L10.6835 31.6666L20.0002 22.35L29.3168 31.6666L31.6668 29.3166L22.3502 20L31.6668 10.6833Z" />
        </svg></button></span>
    
    <div class="restart-btn-container">
    
    <button id="start-hearing-test" class="nav-button back invert btn" data-direction="0">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#333f48" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z" />
</svg>
    Yes, restart hearing test
</button>
<button onclick=dialog.close() class="nav-button">
No, continue with current test
</button>
    </div>
    `;
}

async function getSoundTestSlideHTML(hearingTestType, earText, datadirection) {
  hearingTestContainer.innerHTML = `
  <div id="soundtest">
       <section class="text title hearing-test width-large">Hearing test
          ${hearingTestType}
       </section>

  <div class="info-container">
      <section class="info wide">
          <p class="inter-bold">
              In a silent room:
          </p>
          <ol>
              <li>
                  <p>
                      Move the slider to where you can barely hear the sound in your ${earText}, by dragging
                      the green circle, or using the plus + and minus - buttons.
                  </p>
              </li>
              <li>
                  <p>
                      Click "Next" to move on to the next sound.
                  </p>
              </li>
              <li>
                  <p>
                      Do this for all 5 sliders, then continue to the next ear.
                  </p>
              </li>
          </ol>

      </section>
  </div>

  <div class="calibrate-important hearing-test">
      <p id="number-display">Sound <strong id="sound-test-iteration">1</strong> of 5
      </p>
      <div class="volume-2">
          <div class="indicator">
              <span class="track-span">
                  <div class="track">
                      <svg width="566" height="16" viewBox="0 0 566 16" fill="none"
                          xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd"
                              d="M566 7.62503C566 11.7672 562.642 15.125 558.5 15.125L7.5 15.125C3.35786 15.125 -1.54005e-06 11.7671 -9.92116e-07 7.625C-4.44185e-07 3.48286 3.35787 0.125 7.5 0.125L558.5 0.125032C562.642 0.125033 566 3.4829 566 7.62503Z"
                              fill="#333F48" />
                      </svg>
                      <svg class="trackbar-marker" value="4" width="48" height="48" viewBox="0 0 48 48"
                          fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="24" cy="24" r="24" fill="#008545" />
                      </svg>
                      <div class="bars">
                          <svg xmlns="http://www.w3.org/2000/svg" width="2" height="11" viewBox="0 0 2 11"
                              fill="none">
                              <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2"
                                  stroke-linecap="round" />
                          </svg><svg xmlns="http://www.w3.org/2000/svg" width="2" height="11"
                              viewBox="0 0 2 11" fill="none">
                              <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2"
                                  stroke-linecap="round" />
                          </svg><svg xmlns="http://www.w3.org/2000/svg" width="2" height="11"
                              viewBox="0 0 2 11" fill="none">
                              <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2"
                                  stroke-linecap="round" />
                          </svg><svg xmlns="http://www.w3.org/2000/svg" width="2" height="11"
                              viewBox="0 0 2 11" fill="none">
                              <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2"
                                  stroke-linecap="round" />
                          </svg>
                      </div>
                  </div>

                  <span>${hearingTestType}</span>

              </span>

              <section>
                  <span class="lower">
                      <svg class="volume-button quiet" value=-1 width="72" height="46" viewBox="0 0 72 46"
                          fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g>
                              <path
                                  d="M0 8.25C0 3.96979 3.46979 0.5 7.75 0.5H68C70.2091 0.5 72 2.29086 72 4.5V41.5C72 43.7091 70.2091 45.5 68 45.5H7.75C3.46979 45.5 0 42.0302 0 37.75V8.25Z"
                                  fill="#008545" />
                              <path
                                  d="M46.275 20.5C47.5591 20.5 48.6 21.5409 48.6 22.825V23.5073C48.6 24.7913 47.5591 25.8323 46.275 25.8323H25.325C24.0409 25.8323 23 24.7913 23 23.5073V22.825C23 21.5409 24.0409 20.5 25.325 20.5H46.275Z"
                                  fill="white" />
                          </g>
                      </svg>
                      
                          <p>Quiet</p>
                      
                  </span>

                  <span class="higher">
                      <svg class="volume-button loud" value=1 width="72" height="46" viewBox="0 0 72 46"
                          fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                              d="M0 4.5C0 2.29086 1.79086 0.5 4 0.5H64.25C68.5302 0.5 72 3.96979 72 8.25V37.75C72 42.0302 68.5302 45.5 64.25 45.5H4C1.79086 45.5 0 43.7091 0 41.5V4.5Z"
                              fill="#008545" />
                          <path
                              d="M46.4808 20.865C47.3199 20.865 48.0002 21.5453 48.0002 22.3844V23.6096C48.0002 24.4487 47.3199 25.129 46.4808 25.129H25.0633C24.2242 25.129 23.5439 24.4487 23.5439 23.6096V22.3844C23.5439 21.5453 24.2242 20.865 25.0633 20.865H46.4808ZM36.5317 10.4503C37.3708 10.4503 38.051 11.1305 38.051 11.9696V34.9065C38.051 35.7456 37.3708 36.4259 36.5317 36.4259H35.0369C34.1978 36.4259 33.5176 35.7456 33.5176 34.9065V11.9696C33.5176 11.1305 34.1978 10.4503 35.0369 10.4503H36.5317Z"
                              fill="white" />
                      </svg>
                      
                          <p>Loud</p>
                      
                  </span>

              </section>

          </div>

      </div>
      <div class="volume">
          <div class="indicator">
              <svg class="volume-button quiet" value=-1 width="72" height="46" viewBox="0 0 72 46" fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <g>
                      <path
                          d="M0 8.25C0 3.96979 3.46979 0.5 7.75 0.5H68C70.2091 0.5 72 2.29086 72 4.5V41.5C72 43.7091 70.2091 45.5 68 45.5H7.75C3.46979 45.5 0 42.0302 0 37.75V8.25Z"
                          fill="#008545" />
                      <path
                          d="M46.275 20.5C47.5591 20.5 48.6 21.5409 48.6 22.825V23.5073C48.6 24.7913 47.5591 25.8323 46.275 25.8323H25.325C24.0409 25.8323 23 24.7913 23 23.5073V22.825C23 21.5409 24.0409 20.5 25.325 20.5H46.275Z"
                          fill="white" />
                  </g>
              </svg>
              <div class="track">
                  <svg width="566" height="16" viewBox="0 0 566 16" fill="none"
                      xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd"
                          d="M566 7.62503C566 11.7672 562.642 15.125 558.5 15.125L7.5 15.125C3.35786 15.125 -1.54005e-06 11.7671 -9.92116e-07 7.625C-4.44185e-07 3.48286 3.35787 0.125 7.5 0.125L558.5 0.125032C562.642 0.125033 566 3.4829 566 7.62503Z"
                          fill="#333F48" />
                  </svg>
                  <svg class="trackbar-marker" value="4" width="48" height="48" viewBox="0 0 48 48"
                      fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="24" cy="24" r="24" fill="#008545" />
                  </svg>
                  <div class="bars">
                      <svg xmlns="http://www.w3.org/2000/svg" width="2" height="11" viewBox="0 0 2 11"
                          fill="none">
                          <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2" stroke-linecap="round" />
                      </svg><svg xmlns="http://www.w3.org/2000/svg" width="2" height="11" viewBox="0 0 2 11"
                          fill="none">
                          <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2" stroke-linecap="round" />
                      </svg><svg xmlns="http://www.w3.org/2000/svg" width="2" height="11" viewBox="0 0 2 11"
                          fill="none">
                          <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2" stroke-linecap="round" />
                      </svg><svg xmlns="http://www.w3.org/2000/svg" width="2" height="11" viewBox="0 0 2 11"
                          fill="none">
                          <path d="M1 1.875L1 9.375" stroke="white" stroke-width="2" stroke-linecap="round" />
                      </svg>
                  </div>
              </div>
              <svg class="volume-button loud" value=1 width="72" height="46" viewBox="0 0 72 46" fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                      d="M0 4.5C0 2.29086 1.79086 0.5 4 0.5H64.25C68.5302 0.5 72 3.96979 72 8.25V37.75C72 42.0302 68.5302 45.5 64.25 45.5H4C1.79086 45.5 0 43.7091 0 41.5V4.5Z"
                      fill="#008545" />
                  <path
                      d="M46.4808 20.865C47.3199 20.865 48.0002 21.5453 48.0002 22.3844V23.6096C48.0002 24.4487 47.3199 25.129 46.4808 25.129H25.0633C24.2242 25.129 23.5439 24.4487 23.5439 23.6096V22.3844C23.5439 21.5453 24.2242 20.865 25.0633 20.865H46.4808ZM36.5317 10.4503C37.3708 10.4503 38.051 11.1305 38.051 11.9696V34.9065C38.051 35.7456 37.3708 36.4259 36.5317 36.4259H35.0369C34.1978 36.4259 33.5176 35.7456 33.5176 34.9065V11.9696C33.5176 11.1305 34.1978 10.4503 35.0369 10.4503H36.5317Z"
                      fill="white" />
              </svg>
          </div>
          <div class="symbols">
              <p class="text">Quiet</p>
              ${hearingTestType}
              <p class="text">Loud</p>
          </div>
      </div>
      <div class="sound-nav-container">
          <button id="previous-sound" class="nav-button back previous soundtrack-button previous hidden" value="-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="white" />
              </svg>
              <p>Previous sound</p>
              
          </button>
          <button id="next-sound" class="nav-button soundtrack-button next" value="1"
              data-direction="${datadirection}">

              <p>Next sound</p><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                  fill="none">
                  <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="white" />
              </svg>
          </button>
      </div>
  </div>

  <button id="restart" class="nav-button back invert">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#333f48" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z" />
      </svg>
      Restart hearing test
  </button>



  <div class="progress-bar">
      <div class="page-number">3/4</div>
      <progress value="3" max="4"></progress>
  </div>

</div>
<dialog id="dialog"></dialog>`;
}

async function getResultSlide(resultTitle, resultText) {
  hearingTestContainer.innerHTML = `
  <div id="result">

  <p class="text heading">Here are your results: </p>
  <h1 class="title">${resultTitle}</h1>



  <div class="test info">
      <p class="text width-large">${resultText}</p>
  </div>

  <img class="final-image" src="./resources/images/hearing_buds/Doro_HearingBuds_bud_outside_no_grip_1.png"
      alt="Doro HearingBuds bud outside no grip 1" srcset="">





  <section class="nav-container">
  <button id="restart" class="nav-button back invert">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#333f48" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 7H17V10L21 6L17 2V5H5V11H7V7ZM17 17H7V14L3 18L7 22V19H19V13H17V17Z" />
  </svg>
  Restart hearing test
</button>

      <button id="to-webshop" class="nav-button">
          To HearingBuds product page
          <svg xmlns="http://www.w3.org/2000/svg" width="25" height="24" viewBox="0 0 25 24" fill="none">
              <path
                  d="M19.2002 19H5.2002V5H12.2002V3H5.2002C4.0902 3 3.2002 3.9 3.2002 5V19C3.2002 20.1 4.0902 21 5.2002 21H19.2002C20.3002 21 21.2002 20.1 21.2002 19V12H19.2002V19ZM14.2002 3V5H17.7902L7.9602 14.83L9.3702 16.24L19.2002 6.41V10H21.2002V3H14.2002Z"
                  fill="white" />
          </svg>
      </button>



  </section>

  <div class="progress-bar">
      <div class="page-number"><strong>4/4</strong></div>
      <progress value="4" max="4"></progress>
  </div>
</div>
<dialog id="dialog"></dialog>`;
}
getWelcomeSlide();
