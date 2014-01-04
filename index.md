---
layout: default
title: Welcome!
---
### Welcome to How to RTS

I've been recently interested in RTS Games (Planetary Annihilation and SupCom in particular), so I plan to slowly build up an RTS engine of my own. Along the way I'll do some posts and miniprojects explaining and showing the various things involved.

I'll be posting mini examples as runnable javascript apps to explain how things work.

Check back regularly or subscribe using the [Atom Feed].

[Atom Feed]: /atom.xml

#### Plan

This is a rough list around what I plan on developing and writing up.

- Tower defense essentials
- Pathfinding - Dijkstra / A*
- Modern Pathfinding - flow fields
- AI - Planning
- How to calculate/render vision
- How to merge range weapon circles for rendering

### Posts so far

<div class="bloglist">
{% for post in site.posts %}
	<small>{{ post.date | date_to_string }}</small>
	<h4 class="post-title"><a href="{{ post.url | replace_first: '/', '' }}">{{ post.title }}</a></h4>
	<p>{{ post.description }}</p>
{% endfor %}
</div>

