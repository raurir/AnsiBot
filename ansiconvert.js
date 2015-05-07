var _ = require("underscore");
var Canvas = require("canvas");
var Image = Canvas.Image;
var Promise = require('promise');
var con = console;

module.exports = (function() {

	var canvas,
		pixelSize = 2,
		blockWidth = 8 * pixelSize,
		blockHeight = 16 * pixelSize;

	function genBlock() {
		var c = new Canvas(blockWidth, blockHeight);
		c.ctx = c.getContext("2d");
		return c;
	}

	function genShade(shade) {
		var block = genBlock();
		block.ctx.fillStyle = "#000";
		var c = 0, xi = 1;
		if (shade == 1) xi = 2;
		if (shade == 2) xi = 1;
		if (shade == 3) xi = 2;
		for(var x = 0; x < blockWidth; x += xi) {
			c++; c %= 2;
			var px = x;
			if (shade == 3) {
				block.ctx.fillRect(px * pixelSize, 0, pixelSize, blockHeight);
				px++;
			}
			for(var y = 0; y < blockHeight; y += 2) {
				var py = y + c;
				block.ctx.fillRect(px * pixelSize, py * pixelSize, pixelSize, pixelSize);
			}
		}
		return block;
	}


/*
	var colours = [
		[min,min,min], // black
		[min,min,mid], // blue
		[min,mid,min], // green
		[min,mid,mid], // cyan
		[mid,min,min], // red
		[mid,min,mid], // magenta
		[mid,low,min], // brown
		[mid,mid,mid], // light grey
		[low,low,low], // dark grey
		[low,low,high], // light blue
		[low,high,low], // light green
		[low,high,high], // light cyan
		[high,low,low], // light red
		[high,low,high], // light magenta
		[high,high,low], // yellow
		[high,high,high], // white
	];
*/

	var min = 0, low = 87, mid = 168, high = 255;
	// var min = 0, low = Math.pow(87, 2), mid = Math.pow(168, 2), high = Math.pow(255, 2);

	function getClosest(channel) {
		// returns colours step below, above and shade ratio between the two (0 - 1)
		// channel *= channel;
		var lower, upper, fraction;
		if (channel < low) {
			lower = 0;
			upper = low;
			fraction = channel / low;
		} else if (channel < mid) {
			lower = low;
			upper = mid;
			fraction = (channel - low) / (mid - low);
		} else {
			lower = mid;
			upper = high;
			fraction = (channel - mid) / (high - mid);
		}
		// return [Math.sqrt(lower), Math.sqrt(upper), Math.sqrt(fraction)];
		return [lower, upper, fraction];
	}

	function render(image){
		return new Promise(function(fulfill, reject) {
			try {
				var pixelatedWidth = Math.ceil(image.width / blockWidth),
					pixelatedHeight = Math.ceil(image.height / blockHeight);

				var miniCanvas = new Canvas(pixelatedWidth, pixelatedHeight);
				var ctx = miniCanvas.getContext("2d");
				ctx.scale(1 / blockWidth, 1 / blockHeight);
				con.log("typeof ctx", typeof ctx, typeof image);
				ctx.drawImage(image, 0, 0);
				var pixels = ctx.getImageData(0, 0, pixelatedWidth, pixelatedHeight).data;

				var canvas = new Canvas(image.width, image.height);
				ctx = canvas.getContext("2d");

				var rounder = 64;


				// block test

				// var block = genShade(1);
				// block.ctx.globalCompositeOperation = 'source-in';
				// block.ctx.fillStyle = "red";
				// block.ctx.fillRect(0, 0, blockWidth, blockHeight);
				// ctx.drawImage(block, 0, 0);

				// var block = genShade(2);
				// block.ctx.globalCompositeOperation = 'source-in';
				// block.ctx.fillStyle = "red";
				// block.ctx.fillRect(0, 0, blockWidth, blockHeight);
				// ctx.drawImage(block, blockWidth, 0);

				// var block = genShade(3);
				// block.ctx.globalCompositeOperation = 'source-in';
				// block.ctx.fillStyle = "red";
				// block.ctx.fillRect(0, 0, blockWidth, blockHeight);
				// ctx.drawImage(block, blockWidth * 2, 0);



				for (var i = 0, il = pixels.length; i < il; i += 4) {
					var pixelIndex = i / 4,
						r = pixels[i],
						g = pixels[i+1],
						b = pixels[i+2],
						a = pixels[i+3],

						// r = Math.round(pixels[i] / rounder) * rounder,
						// g = Math.round(pixels[i+1] / rounder) * rounder,
						// b = Math.round(pixels[i+2] / rounder) * rounder,
						// a = Math.round(pixels[i+3] / rounder) * rounder,

						x = pixelIndex % pixelatedWidth * blockWidth,
						y = Math.floor(pixelIndex / pixelatedWidth) * blockHeight;

					var red = getClosest(r),
						green = getClosest(g),
						blue = getClosest(b),
						shade = Math.round((red[2] + green[2] + blue[2]));

					ctx.fillStyle = "rgba(" + [red[0], green[0], blue[0], a] + ")";
					ctx.fillRect(x, y, blockWidth, blockHeight);

					if (shade) {
						var block = genShade(shade);
						block.ctx.globalCompositeOperation = 'source-in';
						block.ctx.fillStyle = "rgba(" + [red[1], green[1], blue[1], a] + ")";
						block.ctx.fillRect(0, 0, blockWidth, blockHeight);
						ctx.drawImage(block, x, y);
					}

				};
				con.log("AnsiConvert render fulfill", canvas);
				fulfill(canvas);
			} catch (e) {
				con.log("AnsiConvert render reject", e);
				reject(e);
			}
		})
	}

	function getBuffer(canvas) {
		con.log("AnsiConvert getBuffer");
		return new Promise(function(fulfill, reject) {
			var then = new Date().getTime();
			canvas.toBuffer(function(err, buf) {
				if (err) {
					con.log("getBuffer reject", err);
					reject(err);
				} else {
					con.log("AnsiConvert getBuffer fulfill");
					fulfill(buf);
				}
			});
		});
	}

	function getCanvas(canvas) {
		con.log("AnsiConvert getCanvas");
		return new Promise(function(fulfill, reject) {
			if (canvas) {
				con.log("getCanvas fulfill");
				fulfill(canvas);
			} else {
				con.log("getCanvas reject canvas is null");
				reject(canvas);
			}
		});
	}



	function convert(image) {
		con.log("convert!");
		return new Promise(function(fulfill, reject) {
			var canvas = render(image);
			var buffer = getCanvas(canvas);
			if (image && canvas && buffer) {
				con.log("AnsiConvert convert - fulfill", image, canvas, buffer)
				fulfill(buffer);
			} else {
				con.log("AnsiConvert reject - fulfill", image, canvas, buffer)
				reject("no idea");
			}
		});
	}

	return {
		render: render,
		getCanvas: getCanvas,
		getBuffer: getBuffer,
		convert: convert
	}
})();