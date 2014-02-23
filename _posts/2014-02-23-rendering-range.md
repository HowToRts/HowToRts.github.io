---
layout: post
title:  "Rendering combined range rings"
description: "When you have multiple units, rather than rendering one circle for each of their weapon ranges, it looks nicer to draw the outline of all of the ranges instead"
date:   2014-02-23
---

Many RTS games have a way to visualise your units range. In Planetary Annihilation this is done by holding the Ctrl key. This gives you something that looks like the following.

<img class="inline" src="/images/2014-02-06/pa-range-rings.png" />

The great thing about how these are drawn is that the range rings are combined rather than just rendering every circle individually, this gives a very visually pleasing result. We are going to try reproduce this.

We'll be implementing this using the HTML5 canvas API, but the concept works similarly with OpenGL and other platforms (details at the end of the post).

Doing this is easy. First we draw all of the range circles as filled in circles, with the radius of the range radius plus half of the outline thickness. This gives us the total area that we want the range rings to cover, but with the centers filled in.

Next we simply clear the area of the range rings, minus half of the outline thickness. This leaves us with just the outlines that we desire!

Implementing this in HTML5 Canvas is very easy.

{% highlight javascript tabsize=4 %}
function draw() {
	var i, r;

	//Reset the canvas
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	//Draw all our range areas to the main canvas.
	//Increase them by half the outline width, this gives us filled in circles over the whole area we want
	ctx.fillStyle = '#f00';
	for (i = rangeRings.length - 1; i >= 0; i--) {
		r = rangeRings[i];

		ctx.beginPath();
		ctx.arc(r.x, r.y, r.size + outlineWidth / 2, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.fill();
	}

	//Now we have big red circles

	//Set a composite operation that says "Clear all of the areas we draw"
	ctx.globalCompositeOperation = 'destination-out';
	ctx.fillStyle = 'rgba(0,0,0,1)';

	//Draw the range circles, draw just the area inside the range ring we want to clear
	for (i = rangeRings.length - 1; i >= 0; i--) {
		r = rangeRings[i];

		ctx.beginPath();
		ctx.arc(r.x, r.y, r.size - outlineWidth / 2, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.fill();
	}
}
{% endhighlight %}

This gives us the following [result]. Click to add a range ring source at the given position.

[result]: /examples/10-rendering-range/index.html

<iframe src="/examples/10-rendering-range/index.html" style="width:800px; height:448px; background-color: white"></iframe>


This technique can be implemented in OpenGL using the stencil buffer.

- First clear and enable the stencil buffer
- Set drawing to only draw to the stencil buffer and replace the existing content, writing '1' to the stencil
- Draw all of the circles, padded by half the outline thickness (this gives us a stencil full of 1s where the range rings are)
- Change the stencil write to replace the existing with 0
- Draw all of the circles, inset by half the outline thickness (this leaves us with just 1s in the outline locations)
- Enable color rendering and set to only render where the stencil is 1
- Draw all of the circles, padded by half the outline thickness

There is a [very good post on stackoverflow with example code] doing this

[very good post on stackoverflow with example code]: http://stackoverflow.com/questions/7490093/drawing-outline-of-intersecting-circles

If you were drawing in 3d (Like Planetary Annihilation / Supreme Commander 2), the resulting texture could then be drawn on the terrain as a decal. (Okay, they probably use something way better than this to draw their range rings, but this might work).