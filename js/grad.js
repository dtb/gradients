var Grad = (function($, Backbone) {
	var Grad = { };

	Grad.App = {
		init: function() {
			var grad = new Grad.Gradient();
			var gradBox = new Grad.GradientBoxView({ model: grad });
			grad.on('change add remove', function() {
				var oldskies = $('#preview').find('div');
				gradBox.render();
				oldskies.remove();
			});

			var gradEdView = new Grad.GradientEditorView({ model: grad });
		},
	};

	Grad.Gradient = Backbone.Collection.extend({
		model: Grad.Stop,
		comparator: function(stop) {
			var pos = stop.get('position').replace(/[^0-9.]+/, '');
			if (pos == "" || _.isNaN(parseFloat(pos))) {
				return 10e6;
			}

			return parseFloat(pos);
		},
		initialize: function(opts) {
			this.on('change', this.sort);
		}
	});

	Grad.Stop = Backbone.Model.extend({
		defaults: {
			color: "",
			position: ""
		},
		initialize: function(opts) {
			if (opts) {
				this.set('color', opts.color);
				this.set('position', opts.position);
			}
		}
	});

	Grad.StopView = Backbone.View.extend({
		template: _.template($('#stop-template').html()),
		tagName: 'li',
		className: 'stop',
		events: {
			'change': "syncModel",
			'keyup': "handleKeyup",
			'focus input': "handleFocus",
			'blur input': "handleBlur"
		},
		isNew: false,
		initialize: function(params) {
			this.isNew = params.isNew || false;
		},
		handleKeyup: function(e) {
			if (e.which == 13 /* enter */
				|| e.which == 27 /* escape */) {
				this.$('input').blur();
				return;
			}

			this.syncModel(e);
		},
		handleFocus: function(e) {
			this.$el.removeClass('blank');
		},
		handleBlur: function(e) {
			if (this.isNew) {
				var vals = _(this.$('input')).map(function(input) { return $(input).val(); });
				if (!_(vals).some()) {
					this.$el.addClass('blank');
				} else {
					this.isNew = false;
				}
			}

			_(_(function() {
				if (!_(this.$('input')).contains(document.activeElement)) {
					this.trigger('blur');
				}
			}).bind(this)).defer();
		},
		syncModel: function(e) {
			var $input = $(e.target);
			_(['position', 'color']).each(function(cls) {
				if ($input.hasClass(cls)) {
					this.model.set(cls, $input.val());
				}
			}, this);
		},
		focus: function() {
			this.$('input:first').focus();
		},
		render: function() {
			this.$el.html(this.template({
				color: this.model.get('color'),
				position: this.model.get('position')
			}));

			if (this.isNew) {
				this.$el.addClass('blank');
			}

			return this;
		},
	}, {
		fromStopLi: function(li) {
			var $el = $(li);

			var stop = new Grad.Stop({
				color: $el.find('input.color').val(),
				position: $el.find('input.position').val(),
			});

			return new Grad.StopView({
				isNew: $el.hasClass('blank'),
				model: stop,
				el: li
			});
		}
	});


	Grad.GradientEditorView = Backbone.View.extend({
		el: '#stops',
		events: {
		},
		newStop: function() {
			var stop = new Grad.Stop();
			var view = new Grad.StopView({ isNew: true, model: stop });
			view.render();
			view.on('blur', this.rejiggerStops, this);

			this.subviews.push(view);
			this.model.add(stop);

			this.$el.append(view.$el);
		},
		initialize: function() {
			this.subviews = [];

			_(this.$el.find('li.stop')).each(this.initStop, this);

			this.$adder = this.$('li.adder');

			for (var i = 0; i <= 9; i++) {
				Mousetrap.bind('' + i, _.bind(this.selectNthStop, this));
			}
		},
		rejiggerStops: function(e) {
			this.subviews.sort(function(a, b) {
				return Grad.Gradient.prototype.comparator(a.model) -
					Grad.Gradient.prototype.comparator(b.model);
			});

			var width = '7',
				hasNew = false;
			_(this.subviews).each(function(stop, i) {
				var domIdx = stop.$el.index();
				var pos = (i - domIdx) * width
				stop.$el.css({
					'left': pos + 'em'
				});
				if (stop.isNew) {
					hasNew = true;
				}
			});

			if (!hasNew) {
				this.newStop();
			}
		},
		selectNthStop: function(e) {
			// 48 == 0 in ASCII
			var N = e.charCode - 48 - 1;
			if (N >= 0 && N < this.subviews.length) {
				this.subviews[N].focus();
				// prevent the char from being typed into the input field O_o
				e.preventDefault();
			}
		},
		initStop: function(el) {
			var view = Grad.StopView.fromStopLi(el);
			view.on('blur', this.rejiggerStops, this);
			this.model.add(view.model);
			this.subviews.push(view);
		}
	});

	Grad.GradientBoxView = Backbone.View.extend({
		template: $('#grad-box-template').html(),
		render: function() {
			var stops = [];
			this.model.each(function(stop) {
				if (stop.get('color') && stop.get('position')) {
					stops.push( stop.get('color') + ' ' + stop.get('position') );
				}
			});

			var css = "background: -webkit-linear-gradient( left, " + stops.join(', ') + " )";

			var $grad_box = $(_.template(this.template, { css: css }));
			$grad_box.appendTo('#preview');

			return this;
		}
	});

	return Grad;
}(jQuery, Backbone));

Grad.App.init();
