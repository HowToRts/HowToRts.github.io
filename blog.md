---
layout: default
title: Blog
---

TODO: Styles in here need fixing

{% for post in site.posts %}
<div class="clearfix">
	<div class="span-3 post-date">
		{{ post.date | date_to_string }}
	</div>
	<div class="span-17 last">
		<h3 class="post-title"><a href="{{ post.url | replace_first: '/', '' }}">{{ post.title }}</a></h3>
		<p>{{ post.description }} <span class="quiet">&hellip;</span></p>
	</div>
</div>
{% unless forloop.last %}<hr />{% endunless %}
{% endfor %}
