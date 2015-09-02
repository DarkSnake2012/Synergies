Teambuilder.ui = new (function() {
	function init_typeahead() {
		var championNames = [];
		Teambuilder.data.champions({collection:true}).each(function (record) {
			championNames.push(champion_fullname(record.name, record.stars));
		});

		var champions = new Bloodhound({
			datumTokenizer: Bloodhound.tokenizers.whitespace,
			queryTokenizer: Bloodhound.tokenizers.whitespace,
			local: championNames
		});
		
		$('#addChampion').typeahead({
			hint:true,
			highlight: true,
			minLength: 1
		}, {
			name: 'champions',
			source: champions,
			limit: 15
		}).on('typeahead:select', champion_selected);
	}
	
	function init() {
		
		Teambuilder.callback = get_results;
		
		for(var stars=1; stars<5; stars++) {
			var champions = Teambuilder.data.champions({stars:stars}).order("name").each(function (record) {
				var div = $('<div>').addClass('checkbox');
				var label = $('<label>').addClass('champion-name').text(champion_fullname(record.name, record.stars)).appendTo(div);
				var input = $('<input type="checkbox">').attr('id', record.___id).prependTo(label);
				div.appendTo('#stars'+stars);
			});
		}
		
		$('#collection input[type=checkbox]').on('click', function (event) {
			var checked = $(this).is(':checked');
			Teambuilder.data.champions($(this).attr('id')).update({collection:checked});
			store_collection();
		});
		retrieve_collection();
		retrieve_settings();
		init_typeahead();
		
		$('body').on('click', '.create_teams', submit_clicked);
		$('#championsList').on('click', 'button.close', remove_clicked);
		$('button.loadChampions').on('click', load_champions_clicked);
		$('button.clearChampions').on('click', clear_champions_clicked);
		$('#settings').on('change', ':input', store_settings);
	}
	this.init = init;
	
	function load_champions_clicked(event) {
		var stars = $(this).data('stars');
		Teambuilder.data.champions({collection:true,stars:parseInt(stars,10)}).each(function (record) {
			add_champion(record.name, record.stars);
		});
	}
	
	function clear_champions_clicked(event) {
		Teambuilder.data.champions({roster:true}).each(function (record) {
			remove_champion(record.___id);
		});
	}

	function store_collection() {
		if(!localStorage) return;
		var collection = Teambuilder.data.champions({collection:true}).select('name','stars');
		localStorage.setItem('collection', JSON.stringify(collection));
	}

	function get_settings_keys() {
		var keys = ['duplicate_class_malus','team_size'];
		Teambuilder.data.effects().each(function (record) {
			keys.push('syn_'+record.code);
		});
		return keys;
	}
	
	function retrieve_collection() {
		if(!localStorage) return;
		var collection = JSON.parse(localStorage.getItem('collection'));
		if(!collection) return;
		collection.forEach(function (record) {
			var champion = Teambuilder.data.champions({name: record[0], stars: record[1]}).first();
			if(champion) {
				$('#'+champion.___id).prop('checked', true);
				Teambuilder.data.champions(champion.___id).update({collection:true});
			}
		});
	}
	
	function store_settings() {
		Teambuilder.reset_cache();
		if(!localStorage) return;
		var settings = {};
		var keys = get_settings_keys();
		keys.forEach(function (key) {
			settings[key] = $('#'+key).val();
		});
		localStorage.setItem('settings', JSON.stringify(settings));
	}
	
	function retrieve_settings() {
		if(!localStorage) return;
		var settings = JSON.parse(localStorage.getItem('settings'));
		if(!settings) return;
		var keys = get_settings_keys();
		keys.forEach(function (key) {
			$('#'+key).val(settings[key]);
		});
	}
	
	function champion_selected(event, suggestion) {
		if(!suggestion.match(/^(.*) (\d)★$/)) {
			console.log("cannot parse input", suggestion);
			return;
		}
		add_champion(RegExp.$1, parseInt(RegExp.$2, 10), suggestion);
	}

	function add_champion(name, stars) {
		var champion = Teambuilder.data.champions({name:name,stars:parseInt(stars,10)}).first();
		if(!champion) {
			console.log("cannot find champion", name, stars);
			return;
		}
		Teambuilder.add_champion(champion);
		$('<li>').addClass('champion').text(champion_fullname(name, stars)).attr('id', champion.___id).addClass('list-group-item').append('<button type="button" class="close" aria-label="Close"><span aria-hidden="true">&times;</span></button>').prependTo('#championsList');
		$('#addChampion').typeahead('val', '');
	}
	
	function remove_champion(id) {
		Teambuilder.remove_champion(id);
		$('#'+id).remove();
	}
	
	function remove_clicked(event) {
		var id = $(this).closest('li').attr('id');
		remove_champion(id);
	}
	
	function submit_clicked(event) {
		if($('.create_teams').attr('disabled')) return;
		$('#teamsList').empty();
		Teambuilder.teamsize = parseInt($('#team_size').val(), 10);
		Teambuilder.duplicate_type_malus = parseInt($('#duplicate_class_malus').val(), 10)*3/2;
		Teambuilder.synergy_weights = {};
		Teambuilder.data.effects().each(function (record) {
			Teambuilder.synergy_weights[record.code] = parseInt($('#syn_'+record.code).val(), 10);
		});
		$('.create_teams').attr('disabled', 'disabled');
		$('#teams .progress-bar').css('width', 0).text('0%');
		setTimeout(Teambuilder.start, 100);
	}
	
	function get_results(result) {
		$('.create_teams').removeAttr('disabled');
		
		var nb_syn = 0, 
			divs = [],
			teamsize = Teambuilder.teamsize,
			teams = [];
		
		for(var i = 0; i < result.length; i++) {
			var champion = Teambuilder.data.champions(result[i]).first();
			var team_num = Math.floor(i / teamsize);
			if(!teams[team_num]) teams[team_num] = [];
			teams[team_num].push(champion);
		}
		
		for(var i = 0; i < teams.length; i++) {
			teams[i] = teams[i].sort(function (a, b) {
				return a.name.localeCompare(b.name);
			});
		}
		
		teams.sort(function (a, b) {
			return a[0].name.localeCompare(b[0].name);
		});
		
		for(var i = 0; i < teams.length; i++) {
			var team = teams[i];
			
			var div = $('<div class="panel panel-default"><div class="panel-heading"><h3 class="panel-title"></h3></div><div class="panel-body"><div class="row champion-images"></div></div><div class="panel-body"><ul class="synergies"></ul></div></div>');
			div.find('.panel-title').text('Team '+(i+1));
			
			for(var j = 0; j < team.length; j++) {
				var champion = team[j];
				
				$('<div>')
					.css('background-image', 'url(images/portraits/'+champion.portrait+'), url(images/mask_'+champion.stars+'.png)')
					.addClass('pull-left champion-portrait border-'+champion.type.toLowerCase())
					.appendTo(div.find('.champion-images'));
				
				// synergies with other champions in the team
				for(var k = 0; k < team.length; k++) {
					if(k === j) continue;
					var champion2 = team[k];
					var synergy = Teambuilder.data.synergies({from: champion.name, stars: champion.stars, to: champion2.name}).first();
					if(synergy) {
						nb_syn++;
						var effect = Teambuilder.data.effects({code:synergy.effect}).first();
						$('<li>').text(Mustache.render(effect.text, {value: synergy.value})).appendTo(div.find('.synergies'));
					}
				}
			}
			divs.push(div);

		}
		$('<p>').text(nb_syn+' active synergies').appendTo('#teamsList');

		divs.forEach(function (div) { div.appendTo('#teamsList'); });
	}
	
	function champion_fullname(name, stars) {
		return Mustache.render('{{name}} {{stars}}★', {name:name,stars:stars});
	}
	this.champion_fullname = champion_fullname;
	
	function champion_image(name, stars) {
		return Mustache.render('images/{{name}} {{stars}}.png', {name:name,stars:stars});
	}
});

$(Teambuilder.ui.init());
