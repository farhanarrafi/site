/**
 * Quran Navigator object to navigate through quran.
 * @author Basit (i@basit.me || http://Basit.me)
 *
 * Online Quran Project
 * http://GlobalQuran.com/
 *
 * Copyright 2011, imegah.com
 * Simple Public License (Simple-2.0)
 * http://www.opensource.org/licenses/Simple-2.0
 * 
 */
var QuranNavigator = (function() {
var self = {
	
	apiURL: 'http://api.globalquran.com/',
	noData: false, // switch to true, if you want to have audio only.
	
	googleAnalyticsID: '',
	
	/**
	 * object contains selected page info
	 */
	settings: {
		ayah: 1,
		surah: 1,
		page: 1,
		juz: 1,
		selectedBy: null,
		selectedLanguage: null,
		selectedSearchBy: null,		
		
		selectedRecitor: null,
		selectedLastRecitorBytes: '',
		playing: true,
		volume: 100,
		muted: false,
		repeat: false,
		repeatEach: 'ayah',
		repeatTimes: 0,
		audioDelay: 0,
		
		showAlef: true,
		showSigns: true,
		ignoreInternalSigns: false,
		
		wbwDirection: 'arabic2english', // if change, then it will be english2arabic
		wbwMouseOver: true,
		
		font: 'auto',
		fontSize: 'medium',
		
		fullScreen: false,
		view: ''
	},
	
	_gaID: 'UA-1019966-3',
	
		
	data: {
		loaded: false,
		ayahList: {},
		quranList: {},
		quran: {},		
		languageCountryList: {},
		languageList: {},		
		search: {}
	},
	
	init: function () {
		Quran.init();
		
		for (var i in Quran._data.UGroups)
	        Quran._data.UGroups[i] = this.quran.parse.regTrans(Quran._data.UGroups[i]);
		
		this.googleAnalytics();
	},
	
	language: {
		
		load: function () {},
		
		list: function ()
		{
			return self.data.languageList;
		},
		
		countryList: function ()
		{
			return self.data.languageCountryList;
		},
		
		selected: function ()
		{
			return self.settings.selectedLanguage;
		}
	},
	
	quran: {
		
		init: function ()
		{
			if (self.settings.selectedBy && typeof(self.settings.selectedBy) == 'object' && this.length() > 0)
				return false;
			
			//backward compatibility
			if (self.settings.selectedBy && typeof(self.settings.selectedBy) != 'object')
			{
				by = self.settings.selectedBy;
				self.quran.reset();
				var selectedArray = by.split('|');
				$.each(selectedArray, function(a, quranBy) {
					self.quran.add(quranBy);					
				});
			}
			else
				self.quran.reset();
		},
		
		load: function () {
			self.load(self.settings.surah, self.settings.ayah);
		},
		
		text: function ()
		{
			var text = {};
			var selected = this.selected();
			var fromVerseNo = Quran.verseNo.page(self.settings.page);
			var toVerseNo = Quran.verseNo.page(self.settings.page+1)-1;

			if (typeof selected == 'object')
			{					
				$.each(selected, function(a, quranBy) {
					text[quranBy] = {};
					for (var i = fromVerseNo; i <= toVerseNo; i++)
					{
						if (self.data.quran[quranBy])
							text[quranBy][i] = self.data.quran[quranBy][i];
						else
						{
							self.quran.remove(quranBy);
							self._gaqPush(['_trackEvent', 'Text', 'Error::`'+quranBy+'` not loaded in text']);
						}
					}
				});
			}
			
			return text;
		},
		
		textNotCached: function ()
		{
			var notCached = [];
			var selected = this.selected();
			var fromVerseNo = Quran.verseNo.page(self.settings.page);
					
			$.each(selected, function(i, quranBy) {

				if (self.data.quran[quranBy])
				{	
					if (!self.data.quran[quranBy][fromVerseNo])
						notCached.push(quranBy);		
				}
				else
					notCached.push(quranBy);	
			});
			
			return notCached.join('|');
		},
		
		list: function (format)
		{
			if (!format)
				return self.data.quranList;
			else
			{
				list = {};
				$.each(self.data.quranList, function(i, info) {
					if (format == info['format'])
						list[i] = info;
				});
				
				return list;
			}
		},
		
		detail: function (by)
		{
			return this.list()[by];
		},
		
		direction: function (by)
		{
			if (by == 'quran-wordbyword')
				return (self.settings.wbwDirection == 'arabic2english') ? 'right' : 'left';
			else if (by == 'quran-kids')
				return (self.settings.wbwDirection == 'arabic2english') ? 'right' : 'left';
			
			languageCode = this.detail(by).language_code;
			return  (typeof(self.language.list()[languageCode]) !== 'undefined') ? self.language.list()[languageCode].dir : 'left';
		},
		
		selected: function ()
		{
			return self.settings.selectedBy;
		},
		
		selectedString: function ()
		{
			var by = [];
			var selected = this.selected();
					
			$.each(selected, function(i, quranBy) {
				by.push(quranBy);	
			});
			
			return by.join('|');
		},
		
		reset: function ()
		{
			self.settings.selectedBy = {};
			self.save();
		},
		
		length: function ()
		{
			if (!self.settings.selectedBy || typeof(self.settings.selectedBy) != 'object')
				return 0;
			
			return Object.keys(self.settings.selectedBy).length;
		},
		
		isSelected: function (quranBy)
		{
			return self.settings.selectedBy[quranBy] ? true : false;
		},
		
		add: function (quranBy)
		{
			self.settings.selectedBy[quranBy] = quranBy;
			self.save();
		},
		
		remove: function (quranBy)
		{
			delete self.settings.selectedBy[quranBy];
			self.save();
		},
		
		parse: {
			
			load: function (quranBy, text)
			{	
				type = self.data.quranList[quranBy].type;
				
				if (type == 'quran' && /tajweed/.test(quranBy))
					return this.parseTajweed(quranBy, text);
				else if (type == 'quran' && /wordbyword/.test(quranBy))
					return this.parseWordByWord(quranBy, text);
				else if (type == 'quran' && /kids/.test(quranBy))
					return this.parseKidsWordByWord(quranBy, text);
				else if (type == 'quran')
					return this.parseQuran(quranBy, text);
				else
					return this.parseTranslation(quranBy, text);
			},
			
			parseQuran: function (quranBy, text)
			{
				if (self.settings.showSigns)
			    {
			        text = this.pregReplace(' ([$HIGH_SALA-$HIGH_SEEN])', '<span class="sign">&nbsp;$1</span>', text);
			        text = this.pregReplace('($SAJDAH)', self.settings.ignoreInternalSigns ? '' : '<span class="internal-sign">$1</span>', text);
			        text = this.pregReplace('$RUB_EL_HIZB', self.settings.ignoreInternalSigns ? '' : '<span class="icon juz-sign"></span>', text);
			    }
			    else
			    	text = this.pregReplace('[$HIGH_SALA-$RUB_EL_HIZB$SAJDAH]', '', text);
			    
			    if (!self.settings.showAlef)
			    	text = this.pregReplace('$SUPERSCRIPT_ALEF', '', text);
			    
			    if (self.settings.font == 'me_quran')
			    {
			        text = this.addSpaceTatweel(text);
			        text = this.pregReplace('($LAM$HARAKA*)$TATWEEL$HAMZA_ABOVE($HARAKA*$ALEF)', '$1$HAMZA$2', text);
			    }
			    else if (/uthmani/.test(quranBy))
			    {
			        text = this.removeExtraMeems(text);
			    }
			    
			    text = this.addTatweel(text);
			    text = this.pregReplace('$ALEF$MADDA', '$ALEF_WITH_MADDA_ABOVE', text);
			    
			    if (self.settings.font != 'me_quran')
			    {
			        text = this.pregReplace('($SHADDA)([$KASRA$KASRATAN])', '$2$1', text);
			        text = this.pregReplace('($LAM$HARAKA*$LAM$HARAKA*)($HEH)', '$1$TATWEEL$2', text);
			    }
			    
			    return text;
			},
			
			parseWordByWord: function (quranBy, text)
			{
				var words = text.split('$');
				var verse_html = '';
				$.each(words, function(i, verse) {
					if (verse)
					{
						var verse = verse.split('|');
					    
						if (self.settings.wbwDirection == 'english2arabic')
						{
							if (self.settings.wbwMouseOver)
								verse_html += '<span class="word"><span class="en tipsWord" title="'+verse[0]+'">'+verse[1]+'</span></span>';
							else
								verse_html += '<span class="word"><span class="en">'+verse[1]+'</span><span class="ar">'+verse[0]+'</span></span>';
						}
						else
						{
							if (self.settings.wbwMouseOver)
								verse_html += '<span class="word"><span class="ar tipsWord" title="'+verse[1]+'">'+verse[0]+'</span></span>';
							else
								verse_html = '<span class="word"><span class="en">'+verse[1]+'</span><span class="ar">'+verse[0]+'</span></span>'+verse_html; 
						}
					}
				});
				
				return verse_html;
			},
			
			parseKidsWordByWord: function (quranBy, text)
			{
				var words = text.split('$');
				var verse_html = '';
				var color = this._color;
				$.each(words, function(i, verse) {
					if (verse)
					{
						var verse = verse.split('|');
					    
						if (self.settings.wbwDirection == 'english2arabic')
						{
							if (self.settings.wbwMouseOver)
								verse_html += '<span class="word wordColor'+color+'"><span class="en tipsWord" title="'+verse[0]+'">'+verse[1]+'</span></span>';
							else
								verse_html += '<span class="word wordColor'+color+'"><span class="en">'+verse[1]+'</span><span class="ar">'+verse[0]+'</span></span>';
						}
						else
						{
							if (self.settings.wbwMouseOver)
								verse_html += '<span class="word wordColor'+color+'"><span class="ar tipsWord" title="'+verse[1]+'">'+verse[0]+'</span></span>';
							else
								verse_html = '<span class="word wordColor'+color+'"><span class="en">'+verse[1]+'</span><span class="ar">'+verse[0]+'</span></span>'+verse_html; 
						}
					}
					
					if (color == 10)
						color = 1;
					++color;
				});
				
				this._color = color;
				
				return verse_html;
			},
			_color: 1,
			
			parseTajweed: function (quranBy, text)
			{
				return text.replace(/\[h/g, '<span class="ham_wasl" title="Hamzat Wasl" alt="').replace(/\[s/g, '<span class="slnt" title="Silent" alt="').replace(/\[l/g, '<span class="slnt" title="Lam Shamsiyyah" alt="').replace(/\[n/g, '<span class="madda_normal" title="Normal Prolongation: 2 Vowels" alt="').replace(/\[p/g, '<span class="madda_permissible" title="Permissible Prolongation: 2, 4, 6 Vowels" alt="').replace(/\[m/g, '<span class="madda_necessary" title="Necessary Prolongation: 6 Vowels" alt="').replace(/\[q/g, '<span class="qlq" title="Qalqalah" alt="').replace(/\[o/g, '<span class="madda_obligatory" title="Obligatory Prolongation: 4-5 Vowels" alt="').replace(/\[c/g, '<span class="ikhf_shfw" title="Ikhfa\' Shafawi - With Meem" alt="').replace(/\[f/g, '<span class="ikhf" title="Ikhfa\'" alt="').replace(/\[w/g, '<span class="idghm_shfw" title="Idgham Shafawi - With Meem" alt="').replace(/\[i/g, '<span class="iqlb" title="Iqlab" alt="').replace(/\[a/g, '<span class="idgh_ghn" title="Idgham - With Ghunnah" alt="').replace(/\[u/g, '<span class="idgh_w_ghn" title="Idgham - Without Ghunnah" alt="').replace(/\[d/g, '<span class="idgh_mus" title="Idgham - Mutajanisayn" alt="').replace(/\[b/g, '<span class="idgh_mus" title="Idgham - Mutaqaribayn" alt="').replace(/\[g/g, '<span class="ghn" title="Ghunnah: 2 Vowels" alt="').replace(/\[/g, '" >').replace(/\]/g, '</span>');
			},
			
			parseTranslation: function (quranBy, text)
			{
				text = text.replace(/\]\]/g, '$').replace(/ *\[\[[^$]*\$/g, '');
				return text;
			},
		
			addSpaceTatweel: function (text)
			{
			    text = this.pregReplace('($SHADDA|$FATHA)($SUPERSCRIPT_ALEF)', '$1$TATWEEL$2', text);
			    text = this.pregReplace('([$HAMZA$DAL-$ZAIN$WAW][$SHADDA$FATHA]*)$TATWEEL($SUPERSCRIPT_ALEF)', '$1$ZWNJ$2', text);
			    return text;
			},
			
			addTatweel: function (text)
			{
			    text = this.pregReplace('($SHADDA|$FATHA)($SUPERSCRIPT_ALEF)', '$1$TATWEEL$2', text);
			    text = this.pregReplace('([$HAMZA$DAL-$ZAIN$WAW][$SHADDA$FATHA]*)$TATWEEL($SUPERSCRIPT_ALEF)', '$1$2', text);
			    return text;
			},
			
			removeExtraMeems: function (text)
			{
			    text = this.pregReplace('([$FATHATAN$DAMMATAN])$LOW_MEEM', '$1', text);
			    text = this.pregReplace('($KASRATAN)$HIGH_MEEM', '$1', text);
			    return text;
			},
			
			highlight: function (pattern, str)
			{
			    pattern = new RegExp('(' + pattern + ')', 'g');
			    str = str.replace(pattern, '◄$1►');
			    str = str.replace(/◄\s/g, ' ◄').replace(/\s►/g, '► ');
			    str = str.replace(/([^\s]*)◄/g, '◄$1').replace(/►([^\s]*)/g, '$1►');
			    
			    while (/◄[^\s]*◄/.test(str))
			    	str = str.replace(/(◄[^\s]*)◄/g, '$1').replace(/►([^\s]*►)/g, '$1');
			    
			    str = str.replace(/◄/g, '<span class="highlight">').replace(/►/g, '</span>');
			    return str;
			},
			
			pregReplace: function (fromExp, toExp, str)
			{
			    fromExp = new RegExp(this.regTrans(fromExp), 'g');
			    toExp = this.regTrans(toExp);
			    return str.replace(fromExp, toExp);
			},
			
			regTrans: function (str) {
			    return str.replace(/\$([A-Z_]+)/g, function (s, i, ofs, all) {
			        return Quran._data.UGroups[i] || Quran._data.UChars[i] || '';
			    });
			}
		}
	},
	
	search: {
		
		_keyword: '',
		_position: 0,
		_positionStartVerse: 0,
		_loading: false,
		
		init: function ()
		{
			if (self.settings.selectedSearchBy && typeof(self.settings.selectedSearchBy) == 'object' && Object.keys(self.settings.selectedSearchBy).length > 0)
				return false;
			
			self.settings.selectedSearchBy = {};
			
			by = self.quran.list('text');
			$.each(by, function(quranBy, detail)
			{
				if (detail.type == 'quran')
					self.search.addQuranBy(quranBy);
				else if (self.data.languageCountryList[quranBy.language_code])
					self.search.addQuranBy(quranBy);
			});
		},
		
		isActive: function ()
		{
			return (this._keyword != '');
		},
		
		load: function (keyword, more)
		{
			if (more && !this.isNext())
				return false;
			
			if (/^[0-9]+:?[0-9]*$/.test(keyword))
			{
				verse = keyword.split(':');
				
				if (verse.length > 1)
				{
					self.settings.surah = Quran._fixSurahNum(parseInt(verse['0']));
					self.settings.ayah = Quran._fixAyahNum(self.settings.surah, parseInt(verse['1']));
				}
				else
				{
					verse = Quran.ayah.fromPage(keyword);
					self.settings.surah = verse.surah;
					self.settings.ayah = verse.ayah;
				}
				
				self.player.reset();
				self.load(self.settings.surah, self.settings.ayah);
				
				return true;
			}				
						
			this._keyword = keyword;
			this._position = more ? this.next() : 0;
			this._loading = true;
			self.load();
		},
		
		loading: function (set)
		{
			if (typeof set != 'undefined')
				this._loading = set;
			
			return this._loading;
		},
			
		stop: function ()
		{
			this._keyword = '';
			this._position = 0;
			self.load(self.surah(), self.ayah());
		},
		
		text: function ()
		{
			return self.data.search.quran;
		},
		
		keyword: function ()
		{
			return this._keyword;
		},
		
		position: function ()
		{
			return this._position;
		},
		
		isNext: function ()
		{
			return self.data.search.paging.next ? true : false;
		},
		
		next: function ()
		{
			return self.data.search.paging.next;
		},
		
		timeTook: function ()
		{
			return self.data.search.timeTook;
		},
		
		totalRows: function ()
		{
			return self.data.search.paging.total_rows;
		},
		
		totalShowing: function ()
		{
			return this.isNext() ? this.next() : this.totalRows; 
		},
		
		selected: function ()
		{
			return self.settings.selectedSearchBy;
		},
				
		isSelected: function (quranBy)
		{
			return self.settings.selectedSearchBy[quranBy] ? true : false;
		},
		
		addQuranBy: function (quranBy)
		{
			self.settings.selectedSearchBy[quranBy] = quranBy;
			self.save();
		},
		
		removeQuranBy: function (quranBy)
		{
			delete self.settings.selectedSearchBy[quranBy];
			self.save();
		},
		
		beginVerse: function ()
		{
			return this._positionStartVerse;
		}
	},
	
	recitor: {
		
		init: function()
		{
			if (self.settings.selectedRecitor && typeof(self.settings.selectedRecitor) == 'object' && this.length() > 0)
				return false;
			
			//backward compatibility
			if (self.settings.selectedRecitor && typeof(self.settings.selectedRecitor) != 'object')
			{
				by = self.settings.selectedRecitor;
				this.reset();
				var selectedArray = by.split('|');
				$.each(selectedArray, function(a, quranBy) {
					self.recitor.add(quranBy);					
				});
			}
			else
				this.reset();
		},
		
		load: function ()
		{
			self.player.load('new');
		},
		
		list: function()
		{
			return self.quran.list('audio');
		},
		
		bitrateList: function (by)
		{			
			row = self.quran.detail(by);
			
			if (!row)
				return {'auto': 'mp3,ogg'};
					
			media = row.media;
			media = media ? $.parseJSON(media) : {};
			
			bitrate = {'auto': 'mp3,ogg'};
			$.each(media, function (id, mediaRow) {
				if (bitrate[mediaRow.kbs])
					bitrate[mediaRow.kbs] += ','+mediaRow.type;
				else
					bitrate[mediaRow.kbs] = mediaRow.type;
			});
			
			return bitrate;
		},
		
		selected: function ()
		{
			return self.settings.selectedRecitor;
		},
		
		selectedKbs: function (quranBy)
		{
			return self.settings.selectedRecitor[quranBy];
		},
		
		reset: function ()
		{
			self.settings.selectedRecitor = {};
			self.save();
		},
		
		length: function ()
		{
			if (!self.settings.selectedRecitor || typeof(self.settings.selectedRecitor) != 'object')
				return 0;
			
			return Object.keys(self.settings.selectedRecitor).length;
		},
		
		isSelected: function (quranBy)
		{			
			return self.settings.selectedRecitor[quranBy] ? true : false;
		},
		
		add: function (quranBy, kbs)
		{	
			if (kbs)
				self.settings.selectedLastRecitorBytes = kbs;
			
			self.settings.selectedRecitor[quranBy] = kbs || 'auto';
			self.save();
		},
		
		remove: function (quranBy)
		{
			delete self.settings.selectedRecitor[quranBy];
			self.save();
		}		
	},
	
	player: {
		off: false,
		id: '#audioPlayer',
		id2: '#audioPlayer2',
		swfPath: 'http://globalquran.com/images',
		audioPath: 'http://audio.globalquran.com/',
		preload: true, // true (two players playing continuesly), false (play with one and load with one) or -1 (just play only, no preload)
		autoBitrate: 'high', // high, low
		_recitor: {},
		_currentPlayer: 0,
		_i: 0, // repeat counter
		_delayID: '',
				
		init: function () 
		{
			if (this.off)
				return; // player is off
			
			if (/iPad/i.test(navigator.userAgent) || /iPhone/i.test(navigator.userAgent) || /iPod/i.test(navigator.userAgent))
			{
				self.settings.playing = false; // cant auto play in iphone
				self.player.preload = -1;  // cant load two instance in iphone
			}
			
			this.setup();
		},
		
		setup: function (remake)
		{
			settings = {
				swfPath: this.swfPath,
				supplied: 'mp3,oga,m4v', // m4v is required here, but not required on files
				wmode: "window",
				volume: self.settings.volume,
				muted: self.settings.muted,
				preload: 'auto',
				cssSelectorAncestor: '',
				cssSelector: {
			        play: "",
			        pause: "",
			        stop: "",
			        seekBar: "",
			        playBar: "",
			        mute: "",
			        unmute: "",
			        volumeBar: "",
			        volumeBarValue: "",
			        currentTime: "",
			        duration: ""
			      },
				size: {
				  width:"0px",
				  height: "0px",
				  cssClass: ""
				},
				ready: function (event)
				{
					if (remake)
						self.player.next();
					else
						self.player.load('new'); // already getting load from recitation change
				},				
				ended: function (event)
				{
					//self.player.destroy();
					//self.player.setup(true);
					if (self.settings.audioDelay && (self.settings.audioDelay > 0 || self.settings.audioDelay != false))
					{
						var delay = (self.settings.audioDelay == 'ayah') ? event.jPlayer.status.duration : self.settings.audioDelay;
						delay = delay * 1000;
						clearTimeout(self.player._delayID);
						self.player._delayID = setTimeout('self.player.next()', delay);
					}
					else
					{					        
						self.player.next();
					}
					
					$('.buffer').css('width', '0%');
				},
				loadstart: function (event)
				{
					if (self.player.status().seekPercent != 100)
					{
						$(".progressBar").addClass("audioLoading");
					}
				},
				loadeddata: function (event)
				{
					$(".progressBar").removeClass("audioLoading");
					self._gaqPush(['_trackEvent', 'Audio', 'load', event.jPlayer.status.src]);
				},
				seeking: function()
				{
					$(".progressBar").addClass("audioLoading");
				},
				seeked: function()
				{
					$(".progressBar").removeClass("audioLoading");
				},
				progress: function (event)
				{
					var percent = 0;
					var audio = self.player.data().htmlElement.audio;
					
					if((typeof audio.buffered === "object") && (audio.buffered.length > 0))
					{
						if(audio.duration > 0)
						{
							var bufferTime = 0;
							for(var i = 0; i < audio.buffered.length; i++)
							{
								bufferTime += audio.buffered.end(i) - audio.buffered.start(i);
								 //console.log(i + " | start = " + audio.buffered.start(i) + " | end = " + audio.buffered.end(i) + " | bufferTime = " + bufferTime + " | duration = " + audio.duration);
							}
							percent = 100 * bufferTime / audio.duration;
						} // else the Metadata has not been read yet.
						//console.log("percent = " + percent);
					} else { // Fallback if buffered not supported
						// percent = event.jPlayer.status.seekPercent;
						percent = 100; // Cleans up the inital conditions on all browsers, since seekPercent defaults to 100 when object is undefined.
					}
					
					$('.buffer').css('width', percent+'%');
				},
				play: function (event)
				{
					$(this).jPlayer("pauseOthers"); // pause all players except this one.
					$(".playingTime").text($.jPlayer.convertTime(event.jPlayer.status.currentTime));
					$(".totalTime").text($.jPlayer.convertTime(event.jPlayer.status.duration));
					$(".progressBar").slider("value", event.jPlayer.status.currentPercentRelative);
				},
				timeupdate: function (event)
				{
					$(".playingTime").text($.jPlayer.convertTime(event.jPlayer.status.currentTime));
					$(".totalTime").text($.jPlayer.convertTime(event.jPlayer.status.duration));
					$(".progressBar").slider("value", event.jPlayer.status.currentPercentRelative);
				},
				error: function(event)
				{
					self._gaqPush(['_trackEvent', 'Audio', 'Error::'+event.jPlayer.error.type, event.jPlayer.error]);
				}
				/*, //TODO do this function properly
				error: function (event) {
					//alert("Error Event: type = " + event.jPlayer.error.type); // The actual error code string. Eg., "e_url" for $.jPlayer.error.URL error.
					switch(event.jPlayer.error.type)
					{
						case $.jPlayer.error.URL:
							//reportBrokenMedia(event.jPlayer.error); // A function you might create to report the broken link to a server log.
							self.player.next(); // A function you might create to move on to the next media item when an error occurs.
						break;
						case $.jPlayer.error.NO_SOLUTION:
							// Do something
					    break;
					}
				}
				
				
				*/
				
			};
			
			if (!$(this.id).length)
			{
				var id = this.id; id = id.replace(/#/, '');
				$('body').append('<div id="'+id+'"></div>');
			}
			
			$(this.id).jPlayer(settings);
			
			if (this.preload != -1)
			{
				if (!$(this.id2).length)
				{
					var id = this.id2; id = id.replace(/#/, '');
					$('body').append('<div id="'+id+'"></div>');
				}
				
				$(this.id2).jPlayer(settings);
			}
			
			if (!remake)
			{
				$( ".progressBar" ).slider({
					range: "min",
					min: 0,
					max: 100,
					animate: true,
					slide: function( event, ui ) {
						self.player.seek(ui.value);
					}
				})
				.bind('mousemove', function(e) {
					var offset = $(this).offset();
					var x = e.pageX - offset.left;
					var w =  $(this).width();
					var percent = 100*x/w;
					var duration = self.player.duration();
					var time = percent * duration / 100;
					$('.progressBar').attr('title', $.jPlayer.convertTime(time));
				})
				.find('.ui-slider-handle').addClass('icon');
				
				$( ".volumeBar" ).slider({
					orientation: "vertical",
					range: "min",
					min: 0,
					max: 100,
					value: self.settings.volume,
					animate: true,
					slide: function( event, ui ) {
						self.player.volume(ui.value);
						self.layout.volume(ui.value);
					}
				})
				.find('.ui-slider-handle').addClass('icon');
			}
			
			$.jPlayer.timeFormat.padMin = false;
		},
		
		load: function (action)
		{			
			if (this.off)
				return; // player is off
			
			if (action == 'new') // check if its new recitor or new bitrate, before reseting the settings.
			{
				this.reset();
			}

			if (!this.preload || this.preload == -1)
			{
				current = this._getFiles('current');
				$(this.id).jPlayer("setMedia", current);
				
				if (this.preload != -1)
				{
					next = this._getFiles('next');
					if (!next) // if reached to 6237 
						this.reset();
					else
						$(this.id2).jPlayer("setMedia", next); // just load only
				}
				
				this._currentPlayer = 1;
			}
			else if (action == 'new' || this._currentPlayer == 0) // this._currentPlayer == 0  needed for prev, but action is needed for new, because there is bug in FF
			{
				current = this._getFiles('current');
				next = this._getFiles('next');
				
				$(this.id).jPlayer("setMedia", current);
				if (!next) // if reached to 6237 
					this.reset();
				else
					$(this.id2).jPlayer("setMedia", next);
				
				this._currentPlayer = 1;
			}
			else if (this._currentPlayer == 1) // player 1
			{
				next = this._getFiles('next');
				if (next) // dont need NOT here, like others. also plays player 1 again, if set this.reset();
					$(this.id).jPlayer("setMedia", next);
				
				this._currentPlayer = 2; // play player 2, while 1 gets load
			}
			else // player 2
			{
				next = this._getFiles('next');
				if (!next) // if reached to 6237 
					this.reset();
				else
					$(this.id2).jPlayer("setMedia", next);
				
				this._currentPlayer = 1; // play player 1, while 2 gets load
			}
		
			if (self.settings.playing && !self.search.isActive()) // if playing, auto play
				self.layout.play();
		},
		
		_getPlayerID: function ()
		{
			if (this._currentPlayer == 0 || this._currentPlayer == 1)
				return this.id;
			else
				return this.id2;
		},
		
		_getFiles: function (get)
		{
			get = get || 'current';
			var files = {};
			var rPos = this._recitor.position;
			var rLen = this._recitor.length;
			
			var surah = self.surah();
			var ayah = self.ayah();
			var verse = self.verse();

			if (get == 'next' && rLen > 1 && rPos <= rLen)
			{
				if (rPos == rLen) // reached the last position
					rPos = 1;
				else
					rPos++;
			}
			
			//single recitor
			var recitor = this._recitor['row'+rPos];
			
			if (rPos == 1 && recitor.lastLoad == verse && ((this.preload == true && this._currentPlayer != 0) || get == 'next')) // increment, sence its same ayah
			{
				verse++;
				next = Quran.ayah.fromVerse(verse);
				surah = next.surah;
				ayah = next.ayah;
			}
			else if (this._currentPlayer == 0 && recitor.lastLoad >= 0) // this is for prev ayahs
				verse = this._recitor['row'+rPos].lastLoad;

			if (surah != 115 && surah != 9 && ayah == 1 && this._recitor.auz && recitor.lastLoad != verse && recitor.lastLoad != 0 && recitor.lastLoad != 1) // play auz
				verse = 0;
			else if (surah != 115 && surah != 9 && surah != 1 && ayah == 1 && recitor.lastLoad != verse && recitor.lastLoad != 1) // play bis
				verse = 1;

			
			if (this.preload == true || ((!this.preload || this.preload == -1) && get != 'next'))
				this._recitor['row'+rPos].lastLoad = verse;
		
			if (verse == 6237)
				return false; // there is no verse 6237
			
			if (recitor.mp3)
				files.mp3 = this.audioPath+recitor.name+'/mp3/'+recitor.kbs+'kbs/'+verse+'.mp3';
			if (recitor.ogg)
				files.oga = this.audioPath+recitor.name+'/ogg/'+recitor.kbs+'kbs/'+verse+'.ogg';
						
			return files;
		},
		
		_recitorReset: function ()
		{
			if (!self.data.loaded)
				return false; // need to load data first
			
			var recitorArray = self.recitor.selected();
			
			if (self.recitor.length() == 0)
			{
				self.recitor.add('ar.alafasy');
								
				list = self.recitor.list();
				$.each(list, function(by, row)
				{
					if (self.language.selected() != 'ar' && self.language.selected() == row.language_code)
					{
						self.recitor.add(by);
						return true;
					}
				});
				
				self.layout.recitorList();
			}			
			
			// setting the recitor array
			var recitor = {auz: true, position: 1, length: self.recitor.length()};
			
			recitorArray = self.recitor.selected();

			i = 0;
			$.each(recitorArray, function(recitorName, kbs) {
				++i; // increment on start, because i starts with 0
				recitorInfo = self.player._recitorInfo(recitorName);
				recitor['row'+i] = recitorInfo;
				recitor['row'+i].name = recitorName;
				recitor['row'+i].lastLoad = -1;
				
				if (!recitorInfo.auz) // if one of the recitor dont have auz, then turn off completely.
					recitor.auz = false;
			});

			this._recitor = recitor;
			this._currentPlayer = 0;
		},
		
		_recitorInfo: function (recitorName)
		{
			if (!recitorName)
				return {
					kbs: '0',
					mp3: false,
					ogg: false,
					auz: false
				};

			row = self.data.quranList[recitorName];
			kbs = self.recitor.selectedKbs(recitorName);
			
			media = row.media;
			media = media ? $.parseJSON(media) : {};
						
			if (kbs == 'auto' || (!media['mp3-'+kbs] && !media['ogg-'+kbs]))
			{
				$.each(media, function(key, mediaRow) {
					kbs = mediaRow.kbs;
					if (self.player.autoBitrate == 'low')
						return; // exit loop
				});
			}
			
			if (media['mp3-'+kbs] && media['mp3-'+kbs]['auz'])
				auz = true;
			else if (media['ogg-'+kbs] && media['ogg-'+kbs]['auz'])
				auz = true;
			else
				auz = false;
			
			return {
				kbs: kbs,
				mp3: media['mp3-'+kbs] ? true : false,
				ogg: media['ogg-'+kbs] ? true : false,
				auz: auz
			};
		},
		
		recitorBy: function ()
		{
			return (this._recitor.length > 0) ? this._recitor['row'+this._recitor.position].name : 'undefined';
		},
		
		recitorKbs: function ()
		{
			return (this._recitor.length > 0) ? this._recitor['row'+this._recitor.position].kbs  : 'undefined';
		},
		
		isPlaying: function ()
		{
			return !this.status().paused;
		},
		
		reset: function (from)
		{
			this._recitorReset();
			this._recitor.position = 1;
			this._i = 0;
			this._currentPlayer = 0;
		},
		
		play: function ()
		{	
			$(this._getPlayerID()).jPlayer('play');
			self.settings.playing = true;
			self.save();
			self._gaqPush(['_trackEvent', 'Audio', 'Play', this.recitorBy()]);
		},
		
		pause: function ()
		{	
			$(this._getPlayerID()).jPlayer('pause');
			self.settings.playing = false;
			self.save();
			self._gaqPush(['_trackEvent', 'Audio', 'Pause', this.recitorBy()]);
		},
		
		stop: function ()
		{	
			$(this._getPlayerID()).jPlayer('stop');
			this.reset();
			self._gaqPush(['_trackEvent', 'Audio', 'Stop', this.recitorBy()]);
		},
		
		next: function ()
		{
			var rPos = this._recitor.position;
			var rLen = this._recitor.length;
			var lastLoad = this._recitor['row'+rPos].lastLoad;
			
			var next = Quran.ayah.next(self.surah(), self.ayah());
			var page = Quran.ayah.page(next.surah, next.ayah);
			var juz  = Quran.ayah.juz(next.surah, next.ayah);
			var surah = next.surah;
			var ayah  =  next.ayah;
			var verse = Quran.verseNo.ayah(next.surah, next.ayah);
			var conf = self.settings;
	
			if (rLen > 1 && rPos != rLen)
			{
				this._recitor.position++;
				this.load('play');
				return;
			}
			else if (self.surah() != 9 && self.ayah() == 1 && (lastLoad == 0 || (self.surah() != 1 && lastLoad == 1))) // for auz,bis and ayah
			{
				if (rLen > 1 && rPos == rLen) // reset to first recitor
					this._recitor.position = 1; 
				
				this.load('play');
				return;
			}
			else if (rLen > 1 && rPos == rLen) // reset to first recitor
				this._recitor.position = 1;
						
			
			if (this.preload == true && rLen == 1 && lastLoad != verse && lastLoad != 0 && lastLoad != 1) // for single recitor
			{
				this.load('play');
				return;
			}
			
			
			if (conf.repeat && conf.repeatEach == 'ayah' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				// loop through recitors, if more then one recitor is selected.
				if (rLen > 1)
				{
					this.load('play'); // recitor position has been reset above.
					return;
				}
				this.play(); // just play, no load
				this._i++;
				return;
			}
			else if (surah != self.surah() && conf.repeat && conf.repeatEach == 'surah' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				if (this.preload != true)
					this._recitor['row1'].lastLoad = -1;
				self.load(self.surah(), 1);
				this._i++;
				return;
			}
			else if (page != self.page() && conf.repeat && conf.repeatEach == 'page' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				if (this.preload != true)
					this._recitor['row1'].lastLoad = -1;
				load = Quran.ayah.fromPage(self.page());
				self.load(load.surah, load.ayah);
				this._i++;
				return;
			}
			else if (juz != self.juz() && conf.repeat && conf.repeatEach == 'juz' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				if (this.preload != true)
					this._recitor['row1'].lastLoad = -1;
				load = Quran.ayah.fromJuz(self.juz());
				self.load(load.surah, load.ayah);
				this._i++;
				return;
			}
			else
			{
				
				if (verse == Quran.verseNo.ayah(self.surah(), self.ayah()) && verse >= 6236)
				{
					if (self.settings.playing && verse >= 6236)
						self.layout.stop();
					return;
				}
				
				self.load(surah, ayah);
				this._i = 0;
				return;
			}
		},
		
		prev: function ()
		{
			var rPos = this._recitor.position;
			var rLen = this._recitor.length;
			var lastLoad = this._recitor['row'+rPos].lastLoad;
			
			var prev = Quran.ayah.prev(self.surah(), self.ayah());
			var page = Quran.ayah.page(prev.surah, prev.ayah);
			var juz  = Quran.ayah.juz(prev.surah, prev.ayah);
			var surah = prev.surah;
			var ayah  =  prev.ayah;
			var verse = Quran.verseNo.ayah(prev.surah, prev.ayah);
			var conf = self.settings;
			
			this._currentPlayer = 0;
			this._i = 0;
			
			//FIXME doesnt work properly on preload enabled, so for now we not repeating auz,bis for ayahs on prev
			if (!this.preload && this.preload == -1 && self.surah() != 9 && self.ayah() == 1 && ((lastLoad != 0 && this._recitor.auz) || (lastLoad != 1 && !this._recitor.auz) || ((lastLoad == 1 && rPos > 1) || (this._recitor.auz && lastLoad == 0 && rPos > 1)))) //&& (lastLoad == self.verse() || (self.surah() != 1 && lastLoad == 1))) // for auz,bis and ayah
			{
				if (!conf.repeat || (conf.repeat && conf.repeatEach != 'ayah')) // ayah repeat on bis gives problem
				{					
					if (rLen > 1 && rPos == 1) // reset to first recitor
						this._recitor.position = this._recitor.length;
					else if (rLen > 1 && rPos > 1)
						this._recitor.position--;
					
					lastLoad = this._recitor['row'+this._recitor.position].lastLoad; 
					
					if (lastLoad == 1 && this._recitor.auz)
					{
						if (this.preload == true)
							this._prevRestRecitor(this._recitor.position, verse);						
						this._recitor['row'+this._recitor.position].lastLoad = 0;
					}
					else if (lastLoad == self.verse())
					{
						if (this.preload == true)
							this._prevRestRecitor(this._recitor.position, this._recitor.auz ? 0 : 1);
						this._recitor['row'+this._recitor.position].lastLoad = 1;
					} 
					else if (lastLoad > self.verse())
					{
						if (this.preload == true)
							this._prevRestRecitor(this._recitor.position, 1);
						this._recitor['row'+this._recitor.position].lastLoad = self.verse();
					}
					
					this.load('play');
					return;
				}
			}
			
			if (rLen > 1 && rPos > 1)
			{
				this._recitor.position--;
				this._recitor['row'+this._recitor.position].lastLoad = self.verse();
				this.load('play');
				return;
			}
			else if (rLen > 1 && rPos == 1) // reset to first recitor
			{
				this._recitor.position = this._recitor.length;
				this._recitor['row'+this._recitor.position].lastLoad = verse;
			}
						
			if (conf.repeat && conf.repeatEach == 'ayah' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				this._recitor['row'+this._recitor.position].lastLoad = self.verse();
				// loop through recitors, if more then one recitor is selected.
				if (rLen > 1)
				{
					this.load('play'); // recitor position has been reset above.
					return;
				}
				this.play(); // just play, no load
				this._i = (this._i > 1) ? this._i-1 : 1;
				return;
			}
			else if (surah != self.surah() && conf.repeat && conf.repeatEach == 'surah' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				if (self.surah() == 114)
					verse = 6236;
				else
					verse = Quran.verseNo.surah(self.surah()+1)-1;
				
				this._recitor.position = this._recitor.length;
				this._recitor['row'+this._recitor.position].lastLoad = verse;
				
				load = Quran.ayah.fromVerse(verse);
				self.load(load.surah, load.ayah);
				this._i = (this._i > 1) ? this._i-1 : 1;
				return;
			}
			else if (page != self.page() && conf.repeat && conf.repeatEach == 'page' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				if (self.page() == 604)
					verse = 6236;
				else
					verse = Quran.verseNo.page(self.page()+1)-1;
				
				this._recitor.position = this._recitor.length;
				this._recitor['row'+this._recitor.position].lastLoad = verse;
				
				load = Quran.ayah.fromVerse(verse);		
				self.load(load.surah, load.ayah);
				this._i = (this._i > 1) ? this._i-1 : 1;
				return;
			}
			else if (juz != self.juz() && conf.repeat && conf.repeatEach == 'juz' && (!conf.repeatTimes || conf.repeatTimes >= this._i))
			{
				if (self.juz() == 30)
					verse = 6236;
				else
					verse = Quran.verseNo.juz(self.juz()+1)-1;
				
				this._recitor.position = this._recitor.length;
				this._recitor['row'+this._recitor.position].lastLoad = verse;
				
				load = Quran.ayah.fromVerse(verse);	
				self.load(load.surah, load.ayah);
				this._i = (this._i > 1) ? this._i-1 : 1;
				return;
			}
			else
			{
				this._recitor['row'+this._recitor.position].lastLoad = verse;
				
				if (verse == Quran.verseNo.ayah(self.surah(), self.ayah()) && verse == 1)
					return;

				self.load(surah, ayah);
				this._i = 0;
				return;
			}
		},
		
		_prevRestRecitor: function (pos, verse)
		{
			for ( var i = 1; i < pos; i++)
            {
				this._recitor['row'+i].lastLoad = verse;
            }
		},
		
		seek: function (percentage, seconds)
		{
			percentage = percentage || 0;
			seconds = seconds || 0;
			
			if (percentage >= 0)
			{
				$(this._getPlayerID()).jPlayer('playHead', percentage);
			}
			else
			{
				if (this.isPlaying())
					$(this._getPlayerID()).jPlayer('play', seconds);
				else
					$(this._getPlayerID()).jPlayer('pause', seconds);				
			}			
		},
		
		volume: function (volume)
		{
			$(this.id).jPlayer('volume', volume);
			$(this.id2).jPlayer('volume', volume);
			self.settings.volume = volume;
			self.save();
		},
		
		mute: function ()
		{			
			$(this.id).jPlayer('mute');
			$(this.id2).jPlayer('mute');
			self.settings.muted = true;
			self.save();
		},
		
		unmute: function ()
		{
			$(this.id).jPlayer('unmute');
			$(this.id2).jPlayer('unmute');
			self.settings.muted = false;
			self.save();
		},
		
		repeat: function (bool)
		{
			self.settings.repeat = bool;
			self.save();
		},
		
		repeatEach: function (repeat)
		{
			self.settings.repeatEach = repeat;
			self.save();
		},
		
		repeatTimes: function (times)
		{
			self.settings.repeatTimes = times;
			self.save();
		},
		
		audioDelay: function (delay)
		{
			self.settings.audioDelay = delay;
			self.save();
		},
		
		duration: function ()
		{
			return this.status().duration;
		},
		
		playingTime: function ()
		{
			return this.status().currentTime;
		},
		
		status: function (playerID)
		{
			var playerID = playerID || this._getPlayerID();
			return $(playerID).data("jPlayer").status;
		},
		
		data: function (playerID)
		{
			var playerID = playerID || this._getPlayerID();
			return $(playerID).data("jPlayer");
		},
		
		destroy: function (playerID)
		{
			if (playerID)			
				$(playerID).jPlayer("destroy").remove();
			else
			{
				if ($(this.id).length)
					$(this.id).jPlayer("destroy").remove();
				if ($(this.id2).length)
					$(this.id2).jPlayer("destroy").remove();
			}
		}
	},
	
	layout: {
		displayStartup: function (success) {}, // replace this function with yours
		display: function (success) {}, // replace this function with yours
		volume: function (val) {},
		play: function () {},
		stop: function () {},
		recitorList: function () {}
	},
	
	font: {
		setFamily: function (fontFamily)
		{
			self.settings.font = fontFamily;
			self.save();
		},
		
		setSize: function (size)
		{
			self.settings.fontSize = size;
			self.save();
		},
		
		getFamily: function (by)
		{			
			if (self.settings.font == 'auto' && self.quran.isSelected(by) && self.quran.detail(by).type == 'quran')
			{
				if (/mac/i.test(navigator.platform)) // isMac
						return 'Scheherazade';
				if (/uthmani/.test(by)) // isUthamani
					return 'me_quran';
				else if (/tajweed/.test(by)) // isTajweed
					return '_PDMS_Saleem_QuranFont';
				else
					return 'KFGQPC Uthman Taha Naskh';
			}
			
			return (self.settings.font != 'auto') ? self.settings.font : '';			
		},
		
		getSize: function ()
		{
			return self.settings.fontSize;
		}
	},
	
	
	
	
	setFullScreen: function (enable)
	{
		this.settings.fullScreen = enable;
		this.save();
	},
	
	
	juz: function (juz)
	{		
		if (juz)
		{
			juz = Quran._fixJuzNum(juz);
			var verse = Quran.ayah.fromJuz(juz);
			
			if (this.page() != Quran.ayah.page(verse.surah, verse.ayah))
			{
				this.load(verse.surah, verse.ayah);
				return false;
			}
		}
		
		return this.settings.juz;
	},
	
	page: function (page)
	{		
		if (page)
		{
			page = Quran._fixPageNum(page);
			var verse = Quran.ayah.fromPage(page);
			
			if (this.page() != Quran.ayah.page(verse.surah, verse.ayah))
			{
				this.load(verse.surah, verse.ayah);
				return false;
			}
		}
		
		return this.settings.page;
	},
	
	surah: function (surah)
	{		
		if (surah)
		{
			surah = Quran._fixSurahNum(surah);
			var ayah = 1;
			
			if (this.page() != Quran.ayah.page(surah, ayah))
			{
				this.load(surah, ayah);
				return false;
			}
			else
			{
				this.settings.surah = surah;
				this.settings.ayah = 1;
			}
		}
		
		return this.settings.surah;
	},
	
	ayah: function (surah, ayah)
	{		
		if (surah)
		{
			surah = Quran._fixSurahNum(surah);
			ayah  = Quran._fixAyahNum(surah, ayah);
			
			if (this.page() != Quran.ayah.page(surah, ayah))
			{
				this.load(surah, ayah);
				return false;
			}
			else
			{
				this.settings.surah = surah;
				this.settings.ayah = ayah;
				this.player.load('new');
				this.save();
			}
		}
		
		return this.settings.ayah;
	},
	
	verse: function (surah, ayah)
	{
		surah = surah ? Quran._fixSurahNum(surah) : this.settings.surah;
		ayah  = ayah ? Quran._fixAyahNum(surah, ayah) : this.settings.ayah;
	
		return Quran.verseNo.ayah(surah, ayah);
	},
	

	nextAyah: function ()
	{
		var verse = Quran.ayah.next(this.surah(), this.ayah());
		
		if (verse.surah == this.surah() && verse.ayah == this.ayah())
			return verse; // ayah already exist on the page
	
		this.settings.surah = verse.surah;
		this.settings.ayah = verse.ayah;
				
		if (this.ayah(verse.surah, verse.ayah))
			return verse; // ayah already exist on the page
		else
			return false;	
	},
	
	prevAyah: function ()
	{
		var verse = Quran.ayah.prev(this.surah(), this.ayah());
		
		if (verse.surah == this.surah() && verse.ayah == this.ayah())
			return verse; // ayah already exist on the page

		this.settings.surah = verse.surah;
		this.settings.ayah = verse.ayah;
				
		if (this.ayah(verse.surah, verse.ayah))
			return verse; // ayah already exist on the page
		else
			return false;
	},
	
	nextPage: function ()
	{
		return this.page(this.page()+1);
	},
	
	prevPage: function ()
	{
		return this.page(this.page()-1);
	},
	
	nextSurah: function () {
		return this.surah(this.surah()+1);
	},
	
	prevSurah: function () {
		return this.surah(this.surah()-1);
	},
	
	ayahs: function () {	
		return this.data.ayahList;
	},
	
	save: function () {
		this._cookieSave(); // save settings
	},
	
	load: function (surah, ayah)
	{
		firstLoad = false;
		notCachedQuranID = true;

		if (surah && ayah)
			this.search._keyword = false;
		
		if (!surah && !ayah && !this.search.isActive())
		{
			firstLoad = true;
			this._cookieRead();
			this.url.load();
		}
		
		if (this.search.isActive())
		{
			this.search.loading(true);
			requestUrl = this.apiURL;
			
			if (firstLoad)
				requestUrl += 'all/';
			
			requestUrl += 'search/'+this.search.keyword()+'/'+this.search.position();
			
			if (this.search.position() == 0)
				this.url.save();
		}
		else if (!surah && !ayah)
		{			
			this.settings.surah = this.settings.surah || 1;
			this.settings.ayah = this.settings.ayah || 1;
			this.settings.juz =  Quran.ayah.juz(this.settings.surah, this.settings.ayah);	
			this.settings.page = Quran.ayah.page(this.settings.surah, this.settings.ayah);		
			this.data.ayahList = Quran.ayah.listFromPage(this.settings.page);
	
			requestUrl = this.apiURL+'all/page/'+this.settings.page;

			if (this.quran.length() > 0)// TODO add this.noData for getting no quran text from server.
				requestUrl += '/'+this.quran.selectedString();
			/*if (this.settings.selectedLanguage) // TODO language selection here
				requestUrl += '/'+this.settings.selectedLanguage;*/
		}//TODO add other methods too ex: search and language pack
		else
		{
			this.settings.surah = surah;
			this.settings.ayah = ayah;
			this.settings.juz = Quran.ayah.juz(surah, ayah);
			this.settings.page = Quran.ayah.page(surah, ayah);		
			this.data.ayahList = Quran.ayah.listFromPage(this.settings.page);
						
			notCachedQuranID = this.quran.textNotCached();			
			
			requestUrl = this.apiURL+'page/'+this.settings.page+'/'+notCachedQuranID;
			this.url.save();
		}
		
		this.save();
		this._gaqPush(['_trackPageview', '/#!'+this.url.page()]);
		
		if (this.noData && !firstLoad) // if no data need to be output, then run request only once
			notCachedQuranID = false;

		if (notCachedQuranID)
		{
			$jsonp = $.support.cors ? '' : '.jsonp?callback=?';
			$.ajaxSetup({ cache: true, jsonpCallback: 'quranData' });

			$.getJSON(requestUrl+$jsonp, function(response) {			
				self._loadResponse(response, firstLoad);
			});
		}
		else
		{
			self.layout.display(true);	
			self.player.load('play');
		}
		
		return false;
	},
	
	_loadResponse: function (response, firstLoad)
	{
		if (typeof(response) == 'object')			
		{
			self.data = $.extend(true, self.data, response);
			self.data.loaded = true;
		}
		
		if (self.search.isActive())
		{
			self.search.init();
			self.search.loading(false);
			if (self.search.totalRows() > 0)
			{
				for (var verseNo in response.search.quran)
				{
					self.search._positionStartVerse = verseNo;
					break;
				}
			}			
		}
		
		if (response.languageSelected)
			self.settings.selectedLanguage = response.languageSelected;
				
		if (firstLoad) // first time loading the page
		{
			self.player.init(); // player
			
			if (!self.quran.length() && typeof(response) == 'object' && response.quran)
			{
				$.each(response.quran, function(defaultQuranBy, ignore) {
					self.quran.add(defaultQuranBy);
				});
				
				this.url.save(); // cause defaultQuranBy set here
			}

			self.layout.displayStartup((typeof(response) == 'object'));
		}
		else
		{
			self.layout.display((typeof(response) == 'object'));
			self.player.load('play');
		}
	},
	
	url: {
		
		load: function ()
		{
			var hash = window.location.hash;
			hash = hash.split('/');
			var count = hash.length;
			
			if (count > 2 && hash['1'] == 'search')
			{
				if (self.search.keyword() == hash['2'] && self.search.position() == 0)
					return false;
				
				self.search._keyword = hash['2'];
				self.search._position = 0;
				
				return true;
			}
			else if (count > 2 && self.settings.page != hash['2'])
			{
				self.quran.reset();
				selectedBy = hash['1'].split('|');
				
				$.each (selectedBy, function(i, quranBy)
				{
					self.quran.add(quranBy);
				});
				
				verse = hash['2'].split(':');
				
				if (verse.length > 1)
				{
					self.settings.surah = Quran._fixSurahNum(parseInt(verse['0']));
					self.settings.ayah = Quran._fixAyahNum(self.settings.surah, parseInt(verse['1']));
				}
				else
				{
					verse = Quran.ayah.fromPage(hash['2']);
					self.settings.surah = verse.surah;
					self.settings.ayah = verse.ayah;
				}		
				
				self.player.reset();
			
				return true;
			}
			else if (/^[0-9]+:?[0-9]*$/.test(hash['1']))
			{
				verse = hash['1'].split(':');
				
				if (verse.length > 1)
				{
					self.settings.surah = Quran._fixSurahNum(parseInt(verse['0']));
					self.settings.ayah = Quran._fixAyahNum(self.settings.surah, parseInt(verse['1']));
				}
				else
				{
					verse = Quran.ayah.fromPage(hash['1']);
					self.settings.surah = verse.surah;
					self.settings.ayah = verse.ayah;
				}		
				
				self.player.reset();
			
				return true;
			}
			
			return false;
		},
		
		save: function ()
		{
			window.location.hash = '#!'+this.page();
		},
		
		hashless: function ()
		{
		    var url = window.location.href;
		    var hash = window.location.hash;
		    var index_of_hash = url.indexOf(hash) || url.length;
		    var hashless_url = url.substr(0, index_of_hash);
		    return hashless_url;
		},
		
		page: function (page)
		{
			if (self.search.isActive())
				return '/search/'+self.search.keyword();
			else
			{
				url = '/';
				by = self.quran.selectedString();
				if (by)
					url += by+'/';
				url += page || self.settings.page;
				return url;
			}
		},
		
		ayah: function (surah, ayah)
		{
			if (self.search.isActive())
				return '/'+self.settings.surah+':'+self.settings.ayah;
			else
			{
				url = '/';
				by = self.quran.selectedString();
				if (by)
					url += by+'/';
				if (surah)
					url += self.settings.surah+':'+self.settings.ayah;
				else
					url += surah+':'+ayah;
				return url;
			}
		}
	},
	
	_cookieRead: function ()
	{
		var settings = '';
		var nameEQ = "settings=";
	    var ca = document.cookie.split(';');
	    for(var i=0;i < ca.length;i++)
	    {
	        var c = ca[i];
	        while (c.charAt(0)==' ')
	        	c = c.substring(1,c.length);
	        
	        if (c.indexOf(nameEQ) == 0) 
	        	settings = c.substring(nameEQ.length,c.length);
	    }
	    
	    settings = $.parseJSON(settings);
	    $.extend(true, this.settings, settings);
	    this.quran.init();
	    this.recitor.init();
	},
	
	_cookieSave: function (data)
	{
		var firstRun = (typeof(data) == 'undefined'); 
		var settings = '';
		data =  firstRun ? this.settings : data;
		
		if (!firstRun && data == null)
			return '{}';
		
		$.each(data, function(key, val) {
			if (typeof(val) == 'object' || typeof(val) == 'array')
				settings += '"'+key+'":'+self._cookieSave(val)+',';
			else if (typeof(val) != 'string')
				settings += '"'+key+'":'+val+','; // no quote's
			else
				settings += '"'+key+'":"'+val+'",';
		});
		settings = settings.slice(0, -1); // this is here, just to remove comma
		settings = '{'+settings+'}';
			
		// first time load  save only
		if (firstRun)
		{
			var date = new Date();
	        date.setTime(date.getTime()+(365*24*60*60*1000)); // expire in 1 year
	        var expires = "; expires="+date.toGMTString();
	        document.cookie = "settings="+settings+expires+"; path=/";
		}
		
		return settings;
	},
	
	googleAnalytics: function ()
	{
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
	    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	    
	    if (typeof(_gaq) == 'undefined')
	    	_gaq = [];	    
	    window._gaq = _gaq || [];
	    
	    if (this.googleAnalyticsID)
	    {
	    	_gaq.push(['b._setAccount', this.googleAnalyticsID]);
	    }
	    
	    _gaq.push(['_setAccount', this._gaID]);
	    this._gaqPush(['_setSessionCookieTimeout', 360000000]);
	    this._gaqPush(['_trackPageview']);   
	},
	
	_gaqPush: function(arrayValue)
	{		
		_gaq.push(arrayValue);
		if (this.googleAnalyticsID)
		{
			arrayValue[0] = 'b.'+arrayValue[0];
			_gaq.push(arrayValue);
		}
	}
};
QuranNavigator = self;
return self;
})();

if (!Object.keys)
{
    Object.keys = function (obj)
    {
        var keys = [],
            k;
        for (k in obj)
        {
            if (Object.prototype.hasOwnProperty.call(obj, k))
            {
                keys.push(k);
            }
        }
        return keys;
    };
}