function header()	{
	
	const header = document.createElement("header");
	
	header.innerHTML = "<div id = 'universalHeader'> <a href = '/index.html'><h1 id = 'topLogo'>Sand</h1></a><h4>A Genre-Agnostic TTRPG</h4><div id = 'options'><a href = '/rules/rulesHomepage.html'><div class = 'headerOption'>Rules</div></a><a href = '/playersPage/player'><div class = 'headerOption'>For Players</div></a><a href = '/GMsPage/GM.html'><div class = 'headerOption'>For Game Masters</div></a><a href = '/modules/modules.html'><div class = 'headerOption'>Modules</div></a></div>"
	
	document.body.appendChild(header);
	
}