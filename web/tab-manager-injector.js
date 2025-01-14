"use strict";

(function () {
  var doInject = function (injectorURL) {
	var script = document.createElement("script");
	script.src = injectorURL;
	script.async = true; script.defer = true;
	document.head.appendChild(script);
  };

  doInject("chrome-extension://fkbbkhghmikohbaphknfnblohnpnjlac/inject.js");

})();