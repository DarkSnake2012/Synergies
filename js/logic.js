var Teambuilder = new (function() {
	var Teambuilder = this,
		genetic = Genetic.create();
	
	Teambuilder.teamsize = 0;
	Teambuilder.duplicate_type_malus = 0;
	Teambuilder.synergy_weights = {};
	Teambuilder.data = {};
	Teambuilder.ui = {};
	Teambuilder.callback = null;

	genetic.optimize = Genetic.Optimize.Maximize;
	genetic.select1 = Genetic.Select1.RandomLinearRank;
	//genetic.select2 = Genetic.Select2.Sequential;
	
	genetic.seed = function() {
		var champions = [];
		// Fisher-Yates inside-out permutation algorithm
		for(var i = 0; i < this.userData.champion_ids.length; i++) {
			var j = Math.floor(Math.random() * (i + 1));
			if(i !== j) champions[i] = champions[j];
			champions[j] = i;
		}
		return champions.join('-');
	};
	
	genetic.mutate = function(entity) {
		var champions = entity.split('-'),
			i = Math.floor(champions.length * Math.random()),
			j = Math.floor(champions.length * Math.random()),
			tmp = champions[i];
		
		champions[i] = champions[j];
		champions[j] = tmp;
		return champions.join('-');
	};
	/*
	genetic.crossover = function(mother, father) {
		console.log('crossover', mother, father);
		
		function team_split(champions, teamsize) {
			var teams = [];
			for(var i = 0; i < teamsize; i++) {
				teams[i] = [];
			}
			while(champions.length) {
				var team = champions.splice(0, teamsize);
				teams[team.length - 1].push(team);
			}
			return teams;
		}
		
		var parent_size = mother.split('-').length,
			mother_split = team_split(mother.split('-'), this.userData.teamsize),
			father_split = team_split(father.split('-'), this.userData.teamsize),
			child = [];
		
		while(child.length < parent_size) {
			for(var size = this.userData.teamsize; size > 0; size--) {
				var team = null;
				
				if(mother_split[size-1].length) {
					team = mother_split[size-1].pop();

					// now we update mother and father to remove the champions from team
					for(var c = 0; c < team.length; c++) {
						var champion = team[c];
						for(var i = 0; i < mother_split.length; i++) {
							
							for(var j = 0; j < mother_split[i].length; j++) {
								var indexOf = mother_split[i][j].indexOf(champion);
								if(indexOf > -1) {
									var team1 = mother_split[i].splice(j, 1);
									team1.splice(indexOf, 1);
									if(team1.length) mother_split[team1.length-1].push(team1);
								}
							}
						}
						
						for(var i = 0; i < father_split.length; i++) {
							for(var j = 0; j < father_split[i].length; j++) {
								var indexOf = father_split[i][j].indexOf(champion);
								if(indexOf > -1) {
									var team1 = father_split[i].splice(j, 1)[0];
									team1.splice(indexOf, 1);
									if(team1.length) father_split[team1.length-1].push(team1);
									break;
								}
							}
						}
					}
					
					var missing_size = this.userData.teamsize - team.length;
					
					if(missing_size) {
						
						if(father_split[missing_size-1].length) {
							
							var missing_team = father_split[missing_size-1].pop();
							team = team.concat(missing_team);
							
						} else {
							
							while(missing_size) {
								
								for(var i = 0; i < father_split.length; i++) {
									
									if(father_split[i].length) {

										var missing_team = father_split[i].pop();
										var elected_missing_team = missing_team.splice(0, missing_size);
										team = team.concat(elected_missing_team);
										missing_size = this.userData.teamsize - team.length;
										if(missing_team.length) {
											father_split[missing_team.length-1].push(missing_team);
										}
									}
								}
							}
						}
					}
					child = child.concat(team);
					
					// now we update mother and father to remove the champions from team
					for(var c = 0; c < team.length; c++) {
						var champion = team[c];
						for(var i = 0; i < mother_split.length; i++) {
							
							for(var j = 0; j < mother_split[i].length; j++) {
								var indexOf = mother_split[i][j].indexOf(champion);
								if(indexOf > -1) {
									var team1 = mother_split[i].splice(j, 1);
									team1.splice(indexOf, 1);
									if(team1.length) mother_split[team1.length-1].push(team1);
								}
							}
						}
						
						for(var i = 0; i < father_split.length; i++) {
							for(var j = 0; j < father_split[i].length; j++) {
								var indexOf = father_split[i][j].indexOf(champion);
								if(indexOf > -1) {
									var team1 = father_split[i].splice(j, 1)[0];
									team1.splice(indexOf, 1);
									if(team1.length) father_split[team1.length-1].push(team1);
									break;
								}
							}
						}
					}
				}
				
				if(team) break;
			}
			
			
			
			
			var tmp = mother_split;
			mother_split = father_split;
			father_split = tmp;

		}
		console.log('child', child);
		var twin = [];
		for(var i = 0; i < child.length; i++) {
			twin[i] = child.length - child[i] - 1;
		}
		console.log('twin', twin);
		return [child.join('-'), twin.join('-')];
	};
	*/
	genetic.fitness = function(entity) {
		var champions = entity.split('-'),
			fitness = 0;
		
		for(var i = 0; i < champions.length; i++) {
			var synergies = this.userData.synergies[champions[i]];
			for(var j = i + 1; j < i + this.userData.teamsize - (i % this.userData.teamsize) && j < champions.length; j++) {
				fitness += synergies[champions[j]];
				if(this.userData.champion_types[champions[i]] === this.userData.champion_types[champions[j]]) {
					fitness -= this.userData.duplicate_type_malus;
				}
			}
		}
		
		return fitness;
	};
	
	genetic.generation = function(pop, generation, stats) {
		return true;
	};
	
	genetic.notification = function(pop, generation, stats, isFinished) {
		var pct = Math.round(generation / this.userData.iterations * 100);
		$('#teams .progress-bar').css('width', pct+'%').text(pct+'%');
		if(isFinished) {
			var winner = pop[0].entity.split('-'),
				champions = winner.map(function (num) {
					return this.userData.champion_ids[num];
				}, this);
			
			this.userData.callback(champions);
		}
	};
	
	
	/**
	 * @param champion a record from Teambuilder.data.champions 
	 */
	Teambuilder.add_champion = function add_champion(champion) {
		Teambuilder.data.champions(champion.___id).update({roster:true});
	}
	
	/**
	 * @param id integer
	 */
	Teambuilder.remove_champion = function remove_champion(id) {
		Teambuilder.data.champions(id).update({roster:false});
	}
	
	/**
	 * @return array of champions
	 */
	Teambuilder.get_champions = function get_champions() {
		return Teambuilder.data.champions({roster:true}).get();
	}
	
	/**
	 * starts the optimizer
	 */
	Teambuilder.start = function start() {
		
		var champion_ids = Teambuilder.data.champions({roster:true}).select('___id');
		
		var champion_types = Teambuilder.data.champions({roster:true}).select('type');
		
		var champion_nums = {};
		var synergies = [];
		for(var i = 0; i < champion_ids.length; i++) {
			champion_nums[champion_ids[i]] = i;
			synergies[i] = [];
		}

		for(var i = 0; i < champion_ids.length; i++) {
			var id1 = champion_ids[i];
			var champion1 = Teambuilder.data.champions(id1).first();
			
			for(var j = i; j < champion_ids.length; j++) {
				var synergy = 0;
				
				var id2 = champion_ids[j];
				var champion2 = Teambuilder.data.champions(id2).first();

				var s1 = Teambuilder.data.synergies({from: champion1.name, stars: champion1.stars, to: champion2.name}).first();
				if(s1) {
					synergy += Teambuilder.synergy_weights[s1.effect];
				}
				var s2 = Teambuilder.data.synergies({from: champion2.name, stars: champion2.stars, to: champion1.name}).first();
				if(s2) {
					synergy += Teambuilder.synergy_weights[s2.effect];
				}
				
				synergies[i][j] = synergy;
				synergies[j][i] = synergy;
			}
		}
		
		var config = {
			"iterations": 10000,
			"size": champion_ids.length
		};
		
		var userData = {
			champion_ids: champion_ids,
			champion_types: champion_types,
			champion_nums: champion_nums,
			synergies: synergies,
			teamsize: Teambuilder.teamsize,
			duplicate_type_malus: Teambuilder.duplicate_type_malus,
			callback: Teambuilder.callback,
			iterations: config.iterations
		};
		
		genetic.evolve(config, userData);
		
	}
	
	/**
	 * called when the parameters of the engine are changed
	 */
	Teambuilder.reset_cache = function reset_cache() {
	};

});
