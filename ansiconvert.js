var _ = require("underscore");
var Canvas = require("Canvas");
var Image = Canvas.Image;
var con = console;
module.exports = (function() {

	var canvas;

	function getCanvas(success) {
		var then = new Date().getTime();
		canvas.toBuffer(function(err, buf) {
			if (err) {
				con.log(err);
			} else {
				success(buf);
			}
		});
	}

	function drawImage(image){

		var min = 0, low = 87, mid = 168, high = 255;

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

		var blockWidth = 8 * 2, 
			blockHeight = 16 * 2;
			pixelatedWidth = Math.ceil(image.width / blockWidth), 
			pixelatedHeight = Math.ceil(image.height / blockHeight);

		var miniCanvas = new Canvas(pixelatedWidth, pixelatedHeight);
		var ctx = miniCanvas.getContext("2d");
		ctx.scale(1 / blockWidth, 1 / blockHeight);
		ctx.drawImage(image, 0, 0);
		var pixels = ctx.getImageData(0, 0, pixelatedWidth, pixelatedHeight).data;

		canvas = new Canvas(image.width, image.height);
		ctx = canvas.getContext("2d");

		var rounder = 64;

		function getClosest(channel) {
			if (channel < low) {
				return [0, low, channel / low];
			} else if (channel < mid) {
				return [low, mid, (channel - low) / (mid - low)];
			} else {
				return [mid, high, (channel - mid) / (high - mid)];
			}
		}

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

				x = pixelIndex % pixelatedWidth,
				y = Math.floor(pixelIndex / pixelatedWidth);

			var r2 = getClosest(r),
				g2 = getClosest(g),
				b2 = getClosest(b);

			ctx.fillStyle = "rgba(" + [r,g,b,a] + ")";
			ctx.fillRect(x * blockWidth, y * blockHeight, blockWidth, blockHeight);
		};

		// 
		// ctx.scale(blockWidth, blockHeight);
		// ctx.drawImage(miniCanvas, 0, 0);

		// con.log(pixels.length);
		// ctx.fillStyle = "red";
		// ctx.fillRect(10, 10, 80, 80);
		// ctx.scale(0.5, 0.5);
		// ctx.drawImage(image, 0, 0);
		// ctx.translate(image.width, 0);
		// ctx.drawImage(image, 0, 0);
		// ctx.translate(0, image.height);
		// ctx.drawImage(image, 0, 0);
		// ctx.translate(-image.width, 0);
	}

	function convert(image, success) {
		drawImage(image);
		getCanvas(success);
	}

	return {
		convert: convert
	}
})();