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

		var low = 87, mid = 168, high = 255;

		var colours = [
			[0,0,0], // black
			[0,0,mid], // blue
			[0,mid,0], // green
			[0,mid,mid], // cyan
			[mid,0,0], // red
			[mid,0,mid], // magenta
			[mid,low,0], // brown
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

		for (var i = 0, il = pixels.length; i < il; i += 4) {
			var pixelIndex = i / 4,
				r = Math.round(pixels[i] / rounder) * rounder,
				g = Math.round(pixels[i+1] / rounder) * rounder,
				b = Math.round(pixels[i+2] / rounder) * rounder,
				a = Math.round(pixels[i+3] / rounder) * rounder,
				x = pixelIndex % pixelatedWidth,
				y = Math.floor(pixelIndex / pixelatedWidth);
			ctx.fillStyle = "rgba(" + [r,b,b,a] + ")";
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