---
layout: post
title:  "Continuum Crowds"
description: "Seeing how well continuum crowds works for RTS games"
date:   2014-01-09
---

Based on the [original Continuum Crowds paper] and [Helmut Dureggers Master Thesis], where he implemented it in OpenCL, I have done a rough implementation of Continuum Crowds.

[original Continuum Crowds paper]: http://grail.cs.washington.edu/projects/crowd-flows/continuum-crowds.pdf
[Helmut Dureggers Master Thesis]: http://cloud.github.com/downloads/hduregger/crowd/Simulation%20of%20large%20and%20dense%20crowds%20on%20the%20GPU%20using%20OpenCL.pdf

The algorithm works roughly like this:  
**Density grid** - A rough idea of how covered this grid location is by agents on/near it  
**Speed grid** - A rough idea of the speed and direction agents in/near this grid location are travelling

Each timestep:

- Clear all our grids
- foreach agent
  - Add them to the density grid (higher density where they are centered, some to the neighbouring cells too)
  - Add their velocity (direction) to the speed grid, weighted by the density they provided to each grid cell
- Divide the speed grid by density to get an average speed grid
- foreach grid cell
  - foreach direction
    - Work out a cost to travel out of this cell in this direction:
	  - If the cell you are moving in to has velocity in the opposite direction then going there is worse than going to one with no velocity or one going in that direction.
	  - If the cell has an obstacle then you can't go there (infinite cost)
	  - If the cell has other discomfort (it's a swamp, so units move slower through it), take that in to account too
- foreach destination (or group of units with the same destination)
  - Do a Eikonal Fill (Dijkstra style breadth first search) of the grid starting at the destination. Use the directional weights calculated above to work out the cost of going from a cell to its neighbour.
  - Generate a Flow Field equivalent using these weights
  - Apply the Flow Field vector to all agents based on the cell they are in (normal flow field following behaviour)

I haven't done all parts of the implementation correctly, and I'm fairly certain I've missed some minor bits out, but based on [Kloots Comments] and [Videos of their CC implementation], I believe my implementation is complete enough for me to be done with it. (Thanks Kloot!)

[Kloots Comments]: http://springrts.com/phpbb/viewtopic.php?f=21&t=27854#p517297
[Videos of their CC implementation]: http://www.youtube.com/watch?v=5u_oNX0PUuw

First, here is my CC implementation in a best case scenario, a tunnel: [Tunnel Example]  
And here it is with the walls removed: [NoObstacles Example]

[Tunnel Example]: /examples/8-1-crossing-groups-continuum-crowds/
[NoObstacles Example]: /examples/8-1-crossing-groups-continuum-crowds/#noobstacles

You can click on the map to redirect the groups, blue will go where you click and red will go to the opposite.

The Tunnel Example is CC at it's best. The 2 groups split up and pass each other in the tunnel with minimum bumping. In comparisson, NoObstacles is a bad case for CC. Both groups start fully spread out and fail to form lines between each other. As such there are some collisions, however this it is still much better than if they just try blindly walk to their destination.

I don't believe that this is how Supreme Commander 2 did its pathfinding. There is way too much recalculation that needs to be done every time step to make this efficient. The behaviour experienced in the game does not match up with how Continuum Crowds behaves. And the only article about the SupCom2 pathfinding (Elijahs Flow Fields article in Game AI Pro) talks about something that doesn't seem to integrate with Continuum Crowds.

Here is the [Official SupCom2 FlowField Trailer] and another SupCom2 video of [Pathfinding Failing]. How the group of small units behave when encountering the large units shows behaviour that is not how I understand Continuum Crowds to behave. Also the bridge in the second video should be an optimum case for CC, but instead results in failure.

[Official SupCom2 FlowField Trailer]: http://www.youtube.com/watch?v=bovlsENv1g4
[Pathfinding Failing]: http://www.youtube.com/watch?v=-60P96VlxXI

I expect that they took some of the ideas of Continuum Crowds like collision prediction, binning for efficient neighbour searching and discomfort fields, but implemented steering behaviours (or similar) to make everything behave well. **Elijah - If you ever read this, lets grab a beer some time :-)**

Of course, I could be totally wrong, these are just my thoughts!

Next up I'll look in to some of these avoidance behaviours, possibly using [ideas from Starcraft 2s Pathing], or from .

[ideas from Starcraft 2s Pathing]: /2014/01/06/pathing-literature-review.html#starcraft-ii-pathing