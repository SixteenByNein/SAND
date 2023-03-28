function header()	{
	
	const header = document.createElement("header");
	
	header.innerHTML = "<div id = 'universalHeader'> <a href = 'index.html'><h1 id = 'topLogo'>Sand</h1></a><h4>A Genre-Agnostic TTRPG</h4><div id = 'options'><div class = 'headerOption'><a href = 'rules/rulesHomepage.html'>Rules</a></div><div class = 'headerOption'><a href = 'playersPage/Player.html'>For Players</a></div><div class = 'headerOption'><a href = 'GMsPage/GM.html'>For Game Masters</a></div><div class = 'headerOption'><a href = 'modules/modules.html'>Modules</a></div></div>"
	
	document.body.appendChild(header);
	
}