document.querySelector('#renderButton').addEventListener('click', e => {
  e.preventDefault();
  renderPlots();
});

const getPeriodOption = () => {
  const period = document.querySelector('#period');
  return period.item(period.selectedIndex);
}
const getPeriodStart = (text) => {
  const period = getPeriodOption();
  switch (period.value) {
    case 'last_day':
      return moment().subtract(24, 'hour');
      break;
    case 'last_week':
      return moment().subtract(1, 'week').startOf('day');
      break;
    case 'two_weeks':
      return moment().subtract(2, 'week').startOf('day');
      break;
    case 'month':
      return moment().subtract(1, 'month').startOf('day');
      break;
    case 'quarter':
      return moment().subtract(3, 'month').startOf('day');
      break;
    case 'year_so_far':
    default:
      return moment().startOf('year');
      break;
  }
}

const renderPlots = () => {
  const servers = JSON.parse(document.querySelector('#config textarea').value);
  const appContainer = document.querySelector('#app');
  const periodText = getPeriodOption().text;

  // Remove all container children
  while (appContainer.firstChild) {
    appContainer.removeChild(appContainer.firstChild);
  }

  Object.keys(servers).forEach(label => {
    const serverId = 'id-' + Math.floor(Math.random() * 100000);
    const template = document.createElement('template');
    const content = `<div class="server-container panel panel-default">
      <div class="panel-heading">
        <h2>${label}</h2>
      </div>
      <div class="panel-body ${serverId}">
        <h4>Deploy Punchcard <small>${periodText}</small></h4>
        <div id="${serverId}"></div>
        <h4>Deploys <small>${periodText}</small></h4>
        <div id="${serverId}-timeline"></div>
      </div>
    </div>`;
    template.innerHTML = content;
    appContainer.appendChild(template.content.firstChild);

    fetch(servers[label])
      .then(r => (r.json()))
      .then(deploys => {
        plotDeploys(deploys, `#${serverId}`);
      });
  });
};

const plotDeploys = (deploys, element) => {
  const periodStart = getPeriodStart();
  const data = [
    [{ key: 'Type', value: 'Dom' }],
    [{ key: 'Type', value: 'Lun' }],
    [{ key: 'Type', value: 'Mar' }],
    [{ key: 'Type', value: 'Mie' }],
    [{ key: 'Type', value: 'Jue' }],
    [{ key: 'Type', value: 'Vie' }],
    [{ key: 'Type', value: 'Sab' }],
  ];
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 24; j++) {
      data[i].push({
        key: j < 10 ? `0${j}` : `${j}`,
        value: 0
      });
    }
  }
  let deploysInPeriod = false;
  deploys.forEach(deploy => {
    const deployDate = moment(deploy.date).add(1, 'hour');
    if (deployDate.isAfter(periodStart)) {
      deploysInPeriod = true;
      const day = deployDate.day();
      const hour = deployDate.hour();
      // First element is the row header
      data[day][hour + 1].value += 1;
    }
  });
  if (deploysInPeriod) {
    showGraph(data, element);
    showTL(deploys, `${element}-timeline`);
  } else {
    const panel = document.querySelector(`.panel-body.${element.replace('#', '')}`);
    // Remove all panel children
    while (panel.firstChild) {
      panel.removeChild(panel.firstChild);
    }
    const template = document.createElement('template');
    const content = `<h4>Sin Deploys en el período</h4>`;
    template.innerHTML = content;
    panel.appendChild(template.content.firstChild);
  }
}

const showTL = (deploys, element) => {
  const periodStart = getPeriodStart();
  let endingTime;
  let tickTime;
  let tickInterval;
  let tickFormat = "%d/%m/%y";
  let beginning = moment(periodStart).startOf('day');
  let ending = moment().endOf('day');

  switch(getPeriodOption().value) {
    case 'last_day':
      beginning = periodStart;
      ending = moment().endOf('hour');
      tickTime = d3.time.hour;
      tickInterval = 1;
      tickFormat = "%H:%M";
      endingTime = [5, 'minute'];
      break;
    case 'last_week':
    case 'two_weeks':
      tickTime = d3.time.hour;
      tickInterval = 6;
      tickFormat = "%d/%m %H:%M";
      endingTime = [20, 'minute'];
      break;
    case 'month':
      endingTime = [20, 'minute'];
      tickTime = d3.time.day;
      break;
    case 'quarter':
      tickTime = d3.time.week;
      endingTime = [1, 'hour'];
      break;
    default:
      tickTime = d3.time.month;
      tickFormat = "%m - %Y";
      endingTime = [1, 'hour'];
      break;
  }
  const data = [{
    times: []
  }];
  deploys.forEach(deploy => {
    const deployDate = moment(deploy.date).add(1, 'hour');
    if (deployDate.isAfter(periodStart)) {
      data[0].times.push({
        "starting_time": deployDate.valueOf(),
        "ending_time": deployDate.add(...endingTime).valueOf()
      });
    }
  });

  const chart = d3.timeline()
    .beginning(beginning)
    .ending(ending)
    .itemHeight(30)
    .rotateTicks(45)
    .showTimeAxisTick()
    .tickFormat({
      tickTime,
      tickInterval,
      format: d3.time.format(tickFormat),
      tickSize: 6
    });

  const svg = d3.select(element).append("svg").attr("width", 1100)
                .datum(data).call(chart);
}

const showGraph = (data, element) => {
  const flatAscending = data.map((array) => (
    array.slice(1)
         .map(sliced => (parseFloat(sliced.value)))
         .filter(element =>  (element > 0))
  ))
  .reduce((a, b) => (a.concat(b)))
  .sort((a, b) => (a - b));

  // we find the upper limit quantile in order
  // to not show upper outliers
  const upperLimit = d3.quantile(flatAscending, 0.95);

  new D3punchcard({
      data,
      element,
      upperLimit,
    })
    .draw({
      width: 1100,
    });
}
