/*
MinScore
minscore.js

Copyright (c) 2013-2018 Kevin Hsieh. All Rights Reserved.
*/

// -----------------------------------------------------------------------------
// GLOBALS
// -----------------------------------------------------------------------------

const app = {
  version: "v5.0.0",
  update_api: "https://api.github.com/repos/kahsieh/minscore/releases/latest"
};

let Gradebook = {
  cats: [],

  addCats: function (n) {
    for (let i = 0; i < n; ++i) {
      if (this.visibleCategories() == this.cats.length) {
        this.cats.push(new Category(this.cats.length));
      } else {
        this.cats[this.visibleCategories()].show();
      }
    }
  },
  removeCats: function (n) {
    for (let i = 0; i < n && this.visibleCategories() > 1; ++i) {
      this.cats[this.visibleCategories() - 1].hide();
    }
  },
  setCats: function (n) {
    if (n >= 100 && !confirm("Use a large number of categories? This could" +
        "crash your browser!")) {
      id("catCount").value = this.visibleCategories();
      return;
    }
    if (n > this.visibleCategories()) {
      this.addCats(n - this.visibleCategories());
    } else {
      this.removeCats(this.visibleCategories() - n);
    }
  },
  checkWeights: function (auto=false) {
    let sum = 0;
    for (let i = 0; i < this.visibleCategories(); ++i) {
      sum += this.cats[i].wgt;
    }
    if (auto || Math.abs(sum - 1) > 1e-6 && confirm("Weights do not add up " +
        "to 100%. Compensate for unentered categories?") ) {
      for (let i = 0; i < this.visibleCategories(); ++i) {
        id("Wgt" + i).value /= sum;
      }
    }
  },
  randFill: function () {
    for (let i = 0; i < this.visibleCategories(); ++i) {
      const randomMax = Math.round(Math.random() * 998 + 1);
      id("Max" + i).value = randomMax;
      id("Pts" + i).value = Math.round(Math.random() * randomMax);
      id("Wgt" + i).value = Math.round(Math.random() * 98 + 1);
    }
    this.checkWeights(true);
  },
  visibleCategories: function () {
    for (let i = 0; i < this.cats.length; ++i) {
      if (!this.cats[i].visible) {
        return i;
      }
    }
    return this.cats.length;
  },
};

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

function id(str) {
  return document.getElementById(str);
}

function round(num, places) {
  let factor = Math.pow(10, places);
  return Math.round(factor * num) / factor;
}

class Category {
  constructor(n, append=true) {
    this.n = n;
    if (append) {
      let newRow = document.createElement("tr");
      newRow.id = `Cat${n}`;
      newRow.innerHTML = `<td>${n + 1}</td>` +
          `<td><input type="number" class="validate" id="Wgt${n}" /></td>` +
          `<td><input type="number" class="validate" id="Pts${n}" /></td>` +
          `<td><input type="number" class="validate" id="Max${n}" /></td>`;
      id("GradeTable").appendChild(newRow);
    }
  }

  hide() {
    id("Cat" + this.n).style.display = "none";
  }
  show() {
    id("Cat" + this.n).style.display = "";
  }

  get visible() {
    return id("Cat" + this.n).style.display != "none";
  }
  get wgt() {
    return id("Wgt" + this.n).value / 100;
  }
  get pts() {
    return +id("Pts" + this.n).value;
  }
  get max() {
    return +id("Max" + this.n).value;
  }
  get value() {
    return this.max === 0 ? 0 : this.wgt * this.pts/this.max;
  }
}

// -----------------------------------------------------------------------------
// APPLICATION
// -----------------------------------------------------------------------------

addEventListener("load", () => {
  id("app-version").innerText = app.version;

  // Check for updates.
  let req = new XMLHttpRequest();
  req.open("GET", app.update_api);
  req.onreadystatechange = () => {
    if (!(req.readyState == 4 && (!req.status || req.status == 200))) {
      return;
    }
    const res = JSON.parse(req.responseText);
    if (res.tag_name && res.tag_name > app.version) {
      id("update-bar").classList.remove("hide");
      id("update-link").href = res.html_url;
    }
  }
  req.send()
  Gradebook.setCats(+id("catCount").value);
});

function main() {
  Gradebook.checkWeights();
  let ret = "";
  const results = calculate();
  if (results === null) {
    return;
  }
  ret += `${round(results[0], 2)}/${round(results[1], 2)}` +
    ` (${round(results[2], 2)}%)`;
  alert(`You need to score at least ${ret}.`);
}

function table(targets) {
  Gradebook.checkWeights();
  let ret = "";
  for (let desiredGrade of targets) {
    const results = calculate(desiredGrade);
    if (results === null) {
      return;
    }
    ret += `${desiredGrade.toFixed(1)}%` +
        `\t${round(results[0], 2)}/${round(results[1], 2)}` +
        ` (${round(results[2], 2)}%)\n`;
  }
  alert(ret);
}

function calculate(desiredGrade=null) {
  if (id("testValue").value === "" || !id("testValue").checkValidity()) {
    alert("Invalid point value");
    return null;
  }
  const testValue = +id("testValue").value;

  if (id("testCat").value === "" || !id("testCat").checkValidity() ||
      +id("testCat").value > Gradebook.visibleCategories()) {
    alert("Invalid category");
    return null;
  }
  const testCat = id("testCat").value - 1;

  if (desiredGrade === null) {
    if (id("desiredGrade").value === "" ||
        !id("desiredGrade").checkValidity()) {
      alert("Invalid target grade");
      return null;
    }
    desiredGrade = +id("desiredGrade").value;
  }

  let sum = 0;
  for (let i = 0; i < Gradebook.visibleCategories(); i++) {
    if (i != testCat) {
      sum += Gradebook.cats[i].value;
    }
  }
  const creditNeeded = (desiredGrade/100 - sum) / Gradebook.cats[testCat].wgt;
  const newMax = Gradebook.cats[testCat].max + testValue;
  const ptsNeeded = creditNeeded * newMax;
  const resultReqpts = ptsNeeded - Gradebook.cats[testCat].pts;
  const resultPercent = 100 * resultReqpts/testValue;
  return [resultReqpts, testValue, resultPercent];
}
