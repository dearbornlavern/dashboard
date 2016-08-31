import { remote, ipcRenderer } from 'electron'; // native electron module
import { IceModel } from './ice_model';

function fetchClassExtension(className, callback) {
  const http = require('http');

  const url = `http://api.ai.codes/jvm/usage/${className}`;
  http.get(url, (response) => {
    let body = '';
    response.on('data', function (d) {
      body += d;
    });
    response.on('end', function () {
      const parsed = JSON.parse(body);
      callback(parsed);
    });
  });
}

const iceModel = new IceModel();

function updateICEDisplay(error, iceId, intention, className_context, extension) {
  'use strict';
  if (iceModel.id == iceId) {
    if (!iceModel.context.has(className_context)) {
      iceModel.context.add(className_context);
      iceModel.extension.add(extension);
    }
  } else {    // construct a new ice Model
    iceModel.id = iceId;
    iceModel.intention = intention;
    iceModel.context.clear();
    iceModel.context.add(className_context);
    iceModel.extension.clear();
    iceModel.extension.add(extension);
  }
  iceModelToDisplay(iceModel);
}

// TODO(exu): merge different methods together and hopefully sort by priority.
function iceModelToDisplay(iceModel) {
  const welcomeDiv = document.getElementById('welcome-div');
  if (welcomeDiv != null) {
    welcomeDiv.outerHTML = '';
  }
  document.getElementById('ice-body').style.display = 'block';

  const intentionNode = document.getElementById('intention');
  const contextNode = document.getElementById('context');
  const extensionNode = document.getElementById('extension');
    // Clean slade
  while (intentionNode.firstChild) {
    intentionNode.removeChild(intentionNode.firstChild);
  }
  while (contextNode.firstChild) {
    contextNode.removeChild(contextNode.firstChild);
  }
  while (extensionNode.firstChild) {
    extensionNode.removeChild(extensionNode.firstChild);
  }

  intentionNode.appendChild(document.createTextNode(iceModel.intention));
  for (const item of iceModel.context) {
    contextNode.appendChild(document.createTextNode(item + '\n'));
  }
  for (const item of iceModel.extension) {
    extensionNode.appendChild(
            document.createElement('PRE').appendChild(
                document.createElement('CODE').appendChild(
                    document.createTextNode(JSON.stringify(item, null, 2) + '\n'))));
  }
}

/*
var plotGoogleCharts = function(usage) {
    "use strict";
    var json_usage = JSON.parse(usage);
    var data = new google.visualization.DataTable();

    data.addColumn('string', 'Method');
    data.addColumn('number', 'Frequency');

    for (var name in json_usage) {
        data.addRow([name, json_usage[name]]);
    }
    var chart = new google.visualization.BarChart(document.getElementById('chart_div'));
    var options = {
        width: 500,
        height: 800,
        bar: {groupWidth: "95%"},
        legend: 'none',
        vAxis: {
            textStyle: {
                'fontName': 'Source Code Pro',
            }
        }
    };
    chart.draw(data, options);
};
*/

ipcRenderer.on('ice-display', updateICEDisplay);

// TODO(exu): there is one more step from cache to ICE.
// Right now we just return from cache directly.
ipcRenderer.on('ice-lookup', (event, iceId, intention, className) => {
  fetchClassExtension(className, extension => {
    'use strict';
    ipcRenderer.send('ice-cache', className, extension);
    updateICEDisplay(null, iceId, intention, className, extension);
  });
});
