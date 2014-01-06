---
layout: post
title:  "Pathing Literature Review"
description: "Heaps of articles, videos on Pathing and some observations on Planetary Annihilation Pathing"
date:   2014-01-06
---

I spent most of today reading articles that were way over my head, so what better to do than to link them all.

First up, the original Continuum Crowds Paper: <http://grail.cs.washington.edu/projects/crowd-flows/>

### Spring RTS

Some discussion on the Spring RTS forums on their pathing:

- <http://springrts.com/phpbb/viewtopic.php?f=21&t=27854>
- <http://springrts.com/phpbb/viewtopic.php?f=21&t=31100>

The improvements in their pathing are really awesome:

- v82 <http://www.youtube.com/watch?v=TyBeCD4dGDI>
- v86 <http://www.youtube.com/watch?v=_HcaumIB20Q>
- v92 <http://www.youtube.com/watch?v=6CgANudrm0s>

In the 3rd video, you can see that the vehicles moving from the left prefer to stay at a distance from each other that leaves room for them to get closer to each other when required.

The reason spring is especially awesome, is that the spring code is available on github to take a look at (Warning: GIANT C++ project). <https://github.com/spring/spring/tree/develop/rts/Sim/Path>

### Continuum Crowds on the GPU

AMD did this a few years back, I'm not sure their implementation is pure Continuum Crowds, but it seems pretty close to it.

- <https://www2.ati.com/misc/siggraph_asia_08/GPUCrowdSimulation.pdf>
- <http://s08.idav.ucdavis.edu/shopf-crowd-simulation-in-froblins.pdf>
- <http://www.youtube.com/watch?v=p7PlQ-q17tM> (6:50)
- <http://www2.ati.com/misc/siggraph_asia_08/GPUCrowdSimulation_SLIDES.pdf>

There is also another implementation, this one has code available on github: <https://helmutduregger.wordpress.com/2011/11/21/simulation-of-large-and-dense-crowds-on-the-gpu-using-opencl/>

### Notes on PA Path finding

I messed around with the Planetary Annihilation path finding. I'm not 100% sure they are using a Continuum Crowds approach as I've seen some behaviour that CC should prevent. Also the article in Game AI Pro talks about pre-generating and caching flow field tiles, which (to my knowledge) would not be possible/useful in Continuum Crowds as you need to regenerate the Flow Field every update to include updated discomfort values (although this Flow Field could probably be used over a few frames). I still don't fully have my head around Continuum Crowds yet, so I may be wrong.

#### Walking units in to each other

We have 2 groups of units: the obstacle group and the test group.

If the obstacle group are static or a tightly moving group, usually telling the test group to walk through them will result in the test group splitting to go around.
Sometimes the split will be from the start of their movement, sometimes they won't split, but will instead walk around the group when they get to it, sometimes they will just attempt to walk right through the obstacle group, usually resulting in the obstacle group becoming slightly reshapen (stretched in the direction of the movement).

If the obstacle group is rapidly moving (2 patrol instructions close together) then usually the walking group will walk in to them, sometimes trying to push through, sometimes driving around at the last moment.

If you run 2 large moving groups of units at each other they do not appear to do continuum crowds style line forming. They do however appear to increase their separation within their group in preparation for crashing together. This separation would improve their chances of making it through each other.
Some separation occurs during a normal move command, but not this much. It is possible something like CC is being used, but at low fidelity.

#### Fitting through tight gaps

From my observations, it would appear that they do not use a 'hard' physics simulation (at least not exclusively). Units appear to be allowed to get a bit closer to their neighbours than their size should allow, there is a force pushing them away, but it is not a hard constraint.

You can reproduce this if you make a large group of units move through a small gap. Or by just moving a large group of units a short distance, once they arrive at their destination they will spread out a small amount.

Units also flow quite quickly through small gaps and can squeeze themselves through 2 walls that are touching.

#### Random thoughts - path finding over time.

When you give a move order to a unit, they will initially walk straight in that direction (Including directly into obstacles). It takes a moment before the flow field takes over.
It is possible that CC is used, but it is only recalculated occasionally when cpu time is free, this would explain why sometimes units walk around groups and sometimes don't until the last minute.
So something like:
Initially walk towards target.
Then generate Flow Field, follow it.
Then generate CC field, follow it.


Next up I plan on getting 2 groups of units in to our simulation so I can make them walk in to each other, then working towards making them behave nicely in such a situation.