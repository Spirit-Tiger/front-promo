function gamificationLogic() {

  const serverUrl = "https://promodo-test-1.vercel.app/";

  let expirationInDays;

  const banner = document.getElementById("banner");
  const modal = document.getElementById("modal");

  //buttons
  const closeBtn = document.getElementById("close-btn");
  const emailBtn = document.getElementById("email-button");
  const codeActivationBtn = document.getElementById("code-button");
  const playButton = document.getElementById("play-button");

  //texts
  const spinMainText = document.getElementById("spin-main-text");
  const spinAditionalText = document.getElementById("spin-aditional-text");

  //dialogues 
  const dialogue1 = document.getElementById("d1");
  const dialogue2 = document.getElementById("d2");
  const dialogue3 = document.getElementById("d3");
  const dialogue4 = document.getElementById("d4");

  //inputs
  const emailInput = document.getElementById("email-input");
  const codeInput = document.getElementById("code-input");

  const inputs = [emailInput, codeInput];

  //error messages
  const invalidEmailMessage = document.getElementById("error-email");
  const invalidCodeMessage = document.getElementById("error-code");

  function clearInputsAndErrors() {
    inputs.forEach((input) => input.value = "");
    invalidEmailMessage.style.display = "none";
    invalidCodeMessage.style.display = "none";
  }

  clearInputsAndErrors();

  const validDomains = [
    "gmail.com",
    "ukr.net",
    "outlook.com",
    "i.ua",
    "icloud.com",
    "yahoo.com",
    "bigmir.net",
    "meta.ua",
    "hotmail.com",
    "tutanota.com",
    "tutanota.de",
    "tutamail.com",
    "tuta.io",
    "keemail.me",
  ];

  function daysToTimestamp(day) {
    return day * 24 * 60 * 60 * 1000;
  }

  banner.onclick = () => {
    modal.style.display = "flex";
    banner.style.display = "none";
  };

  closeBtn.onclick = () => {
    modal.style.display = "none";
    const now = new Date();
    localStorage.setItem(
      "banner_timeout",
      now.getTime() + daysToTimestamp(expirationInDays)
    );
  };

  function checkForShowTimeout() {
    const now = new Date();
    const timeoutInfo = localStorage.getItem("banner_timeout");
    if (timeoutInfo == null) {
      expirationInDays = 1;
      banner.style.display = "block";
    } else if (typeof timeoutInfo == "string") {
      expirationInDays = 7;
      if (now.getTime() > timeoutInfo) {
        localStorage.setItem(
          "banner_timeout",
          now.getTime() + daysToTimestamp(expirationInDays)
        );
        banner.style.display = "block";
      }
    }
  }

  checkForShowTimeout();

  const emailEnterFunction = (e) => {

    if (e.key === 'Enter') {
      console.log("123");
      validateEmailDomain(emailInput.value);
    };
  }

  emailInput.onclick = () => addEventListener("keydown", emailEnterFunction);
  emailBtn.onclick = () => validateEmailDomain(emailInput.value);

  async function validateEmailDomain(email) {
    const domain = email.split("@")[1];
    if (!validDomains.includes(domain)) {
      invalidEmailMessage.style.display = "block";
      return;
    }
    const res = await sendClientRequest("/isPromocodeWinner", "POST", { email });
    if (res.data) {

      invalidEmailMessage.style.display = "block";
      invalidEmailMessage.innerText = "Цей емейл вже приймав участь";
      return;
    }

    invalidEmailMessage.style.display = "none";

    sendClientRequest("/activityCode", "POST", { email })
      .then(res => {
        const userData = {
          email,
          code: res.data
        }
        localStorage.setItem("activity_code", JSON.stringify(userData));
        emailInput.value = "";
        dialogue1.style.display = "none";
        dialogue2.style.display = "flex";
        removeEventListener("keydown", emailEnterFunction)
      })


  }

  const codeEnterFunction = (e) => {
    if (e.key === 'Enter') {
      console.log("321");
      codeActivation();
    };
  }

  codeInput.onclick = () => addEventListener("keydown", codeEnterFunction);
  codeActivationBtn.onclick = () => codeActivation();

  let spinTries = 0;
  let userCounter = 0;
  function codeActivation() {
    const code = JSON.parse(localStorage.getItem("activity_code")).code;
    if (code && code == codeInput.value) {
      sendClientRequest("/getUserCounter", "GET").then((res) => {
        userCounter = res.data.counter;
        spinTries = 3;
        codeInput.value = "";
        dialogue2.style.display = "none";
        dialogue3.style.display = "flex";
        removeEventListener('keydown', codeEnterFunction);
      }

      );
    }
    if (code != codeInput.value) {
      invalidCodeMessage.style.display = "block";
    }
  }

  playButton.onclick = () => playRoulette();

  function playRoulette() {
    playButton.disabled = true;
    spinRoulette();
  }

  let positionOffset = 0;
  let lastPosition = 0;
  const spinTimeoutValue = 3050;

  function spinRoulette() {

    const spinningWheel = document.getElementById("spinningWheel");

    spinningWheel.style.transition = "transform";
    spinningWheel.style.transform = `rotate(${lastPosition}deg)`;

    sendClientRequest("/getSpinResult", "POST", { userCounter })
      .then(res => {
        spinTries--;
        spinAnimation(res.data.spinResult.position);
        if (res.data.spinResult.value !== "loss") {
          rouletteTimeout(winSpin, spinTimeoutValue, res.data.spinResult.value);
        }
        if (res.data.spinResult.value === "loss") {
          if (spinTries === 2) {
            rouletteTimeout(twoSpinsLeft, spinTimeoutValue);
          }
          if (spinTries === 1) {
            rouletteTimeout(oneSpinLeft, spinTimeoutValue);
          }
          if (spinTries === 0) {
            rouletteTimeout(lossSpin, spinTimeoutValue);
          }
        }
      });
  }

  const winSpin = (result) => {
    const userData = JSON.parse(localStorage.getItem("activity_code"));
    const postData = {
      email: userData.email,
      prize: result
    };

    sendClientRequest("/winPromocode", "POST", postData);
    spinMainText.innerHTML = `Вітаємо!<br>Ви виграли ${result}`;
    spinAditionalText.style.display = "block";
    playButton.onclick = () => {
      modal.style.display = "none";
      window.open("https://infoshina.com.ua/uk?utm_source=eSputnik-landing&utm_medium=landing&utm_campaign=Activity_HB_2023_win", "_blank")
    }
    playButton.innerText = "На пошту";
    playButton.disabled = false;
  }

  const twoSpinsLeft = () => {
    spinMainText.innerHTML = `Удача вже близько!<br>Лишилось дві спроби`;
    playButton.disabled = false;


  }

  const oneSpinLeft = () => {
    spinMainText.innerHTML = "Остання спроба!";
    playButton.disabled = false;


  }

  const lossSpin = () => {
    dialogue3.style.display = "none";
    dialogue4.style.display = "flex";
  }

  function rouletteTimeout(todoFunction, timeout, result) {
    setTimeout(todoFunction, timeout, result);
  }

  function spinAnimation(position) {
    positionOffset = 1800 + -45 * position + 22.5;
    lastPosition = -45 * position + 22.5;
    const spinDegree = positionOffset;
    spinningWheel.style.transition = "transform 3s ease-out";
    spinningWheel.style.transform = `rotate(${spinDegree}deg)`;
  }


  async function sendClientRequest(path, methodType, payload = {}) {

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const options = {
      method: methodType,
      headers: defaultHeaders,
    }

    if (payload && methodType !== 'GET') {
      options.body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(serverUrl + path, options);
      const result = await response.json();
      return result;
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }
}

gamificationLogic();
