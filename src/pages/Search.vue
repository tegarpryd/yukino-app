<template>
    <div>
        <PageTitle title="Search" />
        <div
            class="
                mt-6
                flex flex-row
                justify-center
                items-center
                flex-wrap
                gap-2
            "
        >
            <input
                class="flex-grow bg-gray-100 dark:bg-gray-800 rounded border-transparent transition duration-300"
                type="text"
                placeholder="Type in anime's name..."
                @keypress.enter="!!void search()"
                @input="!!void setTerms($event)"
            />

            <button
                class="text-white bg-indigo-500 hover:bg-indigo-600 transition duration-300 px-4 py-2 rounded"
                type="submit"
                @click.stop.prevent="!!void search()"
            >
                Search
            </button>
        </div>

        <div class="flex flex-col gap-2 text-sm mt-6">
            <div
                class="flex flex-row justify-start items-center flex-wrap gap-2"
                v-for="[cat, plugins] in Object.entries(allPlugins)"
            >
                <p class="opacity-75 capitalize">{{ cat }}:</p>

                <div
                    :class="[
                        'px-2 py-0.5 rounded cursor-pointer',
                        selectedPlugin.includes(plugin.name)
                            ? 'bg-green-400 dark:bg-green-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition duration-300'
                    ]"
                    :title="
                        selectedPlugin.includes(plugin.name)
                            ? 'Selected'
                            : 'Disabled'
                    "
                    v-for="plugin in plugins"
                >
                    <p @click.stop.prevent="!!void toggleSelected(plugin.name)">
                        {{ plugin.name }}
                    </p>
                </div>
            </div>
        </div>

        <p
            class="text-center mt-6 opacity-75"
            v-if="result.state === 'waiting'"
        >
            Enter something to search for!
        </p>
        <Loading
            class="mt-8"
            v-else-if="result.state === 'resolving'"
            :text="`Fetching results for ${terms}...`"
        />
        <p
            class="text-center mt-6 opacity-75"
            v-else-if="result.state === 'failed'"
        >
            Failed to fetch results.
        </p>
        <p
            class="text-center mt-6 opacity-75"
            v-else-if="result.state === 'resolved' && result.data?.length === 0"
        >
            No results were found.
        </p>
        <div
            class="mt-8"
            v-else-if="result.state === 'resolved' && result.data"
        >
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 items-center">
                <div class="col-span-1" v-for="anime in result.data">
                    <router-link
                        :to="anime.route"
                        class="
                            hover-pop
                            flex flex-row
                            justify-center
                            items-center
                            gap-4
                            bg-gray-100
                            dark:bg-gray-800
                            rounded
                            p-3
                            cursor-pointer
                        "
                    >
                        <img
                            :class="[
                                'rounded flex-none w-20',
                                anime.description ? 'sm:w-32' : 'sm:w-20'
                            ]"
                            :src="getValidImageUrl(anime.thumbnail)"
                            :alt="anime.title"
                            v-if="anime.thumbnail"
                        />
                        <div class="flex-grow">
                            <p
                                class="
                                    text-xs
                                    opacity-75
                                    text-indigo-500
                                    dark:text-indigo-400
                                    font-bold
                                "
                            >
                                {{ anime.plugin }}
                            </p>
                            <p class="mt-0.5 text-lg font-bold leading-snug">
                                {{ anime.title }}
                            </p>
                            <div class="mt-1 flex flex-row flex-wrap gap-1">
                                <span
                                    class="
                                        capitalize
                                        text-white text-xs
                                        px-1
                                        py-0.5
                                        rounded-sm
                                        bg-red-500
                                    "
                                    v-if="anime.type"
                                    >Type: {{ anime.type }}</span
                                >
                                <template v-if="anime.additional">
                                    <span
                                        class="
                                        text-white text-xs
                                        px-1
                                        py-0.5
                                        rounded-sm
                                        bg-blue-500
                                    "
                                        v-if="'episodes' in anime.additional"
                                        >Episodes:
                                        {{ anime.additional.episodes }}</span
                                    >
                                    <span
                                        class="
                                        text-white text-xs
                                        px-1
                                        py-0.5
                                        rounded-sm
                                        bg-blue-500
                                    "
                                        v-if="'volumes' in anime.additional"
                                        >Volumes:
                                        {{ anime.additional.volumes }}</span
                                    >
                                </template>
                                <span
                                    class="
                                        text-white text-xs
                                        px-1
                                        py-0.5
                                        rounded-sm
                                        bg-purple-500
                                    "
                                    v-if="anime.additional?.score"
                                    >Score: {{ anime.additional.score }}</span
                                >
                            </div>
                            <p
                                class="
                                    mt-2
                                    text-sm
                                    opacity-75
                                    leading-tight
                                    hidden
                                    sm:block
                                "
                                v-if="anime.description"
                            >
                                {{ anime.description }}
                                <ExternalLink
                                    text="read more at MyAnimeList"
                                    :url="anime.url"
                                />
                            </p>
                            <p
                                class="mt-1 text-sm opacity-75 leading-tight"
                                v-if="anime.air"
                            >
                                {{ anime.air }}
                            </p>
                            <ExternalLink
                                class="text-xs"
                                :text="`View at ${anime.plugin}`"
                                :url="anime.url"
                                v-if="!anime.description"
                            />
                        </div>
                    </router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, watch } from "vue";
import { RouteLocationRaw } from "vue-router";
import { Extractors, Rpc, Store } from "../plugins/api";
import { StateController, util } from "../plugins/util";
import { StoreKeys } from "../plugins/types";

import PageTitle from "../components/PageTitle.vue";
import Loading from "../components/Loading.vue";
import ExternalLink from "../components/ExternalLink.vue";

interface ResultType {
    title: string;
    description: string;
    thumbnail: string;
    url: string;
    air: string;
    plugin: string;
    route: RouteLocationRaw;
    type: "anime" | "manga";
    additional?: (
        | {
              volumes: string;
          }
        | {
              episodes: string;
          }
    ) & {
        score: string;
    };
}

interface PluginEntity {
    name: string;
    type: string;
    category: "anime" | "manga" | "MyAnimeList-Anime" | "MyAnimeList-Manga";
}

export default defineComponent({
    name: "Search",
    components: {
        PageTitle,
        Loading,
        ExternalLink
    },
    data() {
        const plugins: Record<string, PluginEntity[]> = {
            anime: [
                {
                    name: "MyAnimeList (Anime)",
                    type: "extended",
                    category: "MyAnimeList-Anime"
                }
            ],
            manga: [
                {
                    name: "MyAnimeList (Manga)",
                    type: "extended",
                    category: "MyAnimeList-Manga"
                }
            ]
        };

        const data: {
            terms: string;
            result: StateController<ResultType[]>;
            selectedPlugin: string[];
            allPlugins: typeof plugins;
        } = {
            terms:
                typeof this.$route.query.terms === "string"
                    ? this.$route.query.terms
                    : "",
            result: util.createStateController(),
            selectedPlugin: Array.isArray(this.$route.query.plugins)
                ? <string[]>(
                      this.$route.query.plugins.filter(
                          x => typeof x === "string"
                      )
                  )
                : ["MyAnimeList (Anime)"],
            allPlugins: plugins
        };

        return data;
    },
    mounted() {
        this.getAllPlugins();
        this.watchPluginChange();
        if (this.$route.query.autoSearch === "1") {
            this.search();
        }
    },
    methods: {
        setTerms(e: Event) {
            const target = e.target as HTMLInputElement | null;
            if (target?.value) {
                this.terms = target.value;
            }
        },
        watchPluginChange() {
            watch(
                () => this.selectedPlugin,
                (cur, prev) => {
                    if (cur !== prev && this.terms) {
                        this.search();
                    }
                }
            );
        },
        toggleSelected(plugin: string) {
            this.selectedPlugin = this.selectedPlugin.includes(plugin)
                ? this.selectedPlugin.filter(x => x !== plugin)
                : [...this.selectedPlugin, plugin];
        },
        async getAllPlugins() {
            const client = await Extractors.getClient();

            const animePlugins = Object.keys(client.anime);
            animePlugins.forEach((x: string) => {
                this.allPlugins.anime.push({
                    name: x,
                    type: "short",
                    category: "anime"
                });
            });

            const mangaPlugins = Object.keys(client.manga);
            mangaPlugins.forEach((x: string) => {
                this.allPlugins.manga.push({
                    name: x,
                    type: "short",
                    category: "manga"
                });
            });
        },
        async search() {
            if (!this.terms) {
                return this.$logger.emit(
                    "warn",
                    "Provide some search terms to search!"
                );
            }

            if (this.terms.length < 3) {
                return this.$logger.emit(
                    "warn",
                    "Enter atleast 3 characters to search!"
                );
            }

            if (!this.selectedPlugin.length) {
                return this.$logger.emit(
                    "warn",
                    "Select atleast one source to search!"
                );
            }

            this.result.data = null;
            const results = [];
            this.result.state = "resolving";
            const client = await Extractors.getClient();

            const allPlugins = Object.values(this.allPlugins).flat(1);
            for (const pluginName of this.selectedPlugin) {
                try {
                    const config = allPlugins.find(x => x.name === pluginName);
                    if (!config) {
                        this.$logger.emit(
                            "error",
                            "Corresponding plugin was not found!"
                        );
                    } else if (config.category === "MyAnimeList-Anime") {
                        const data = await client.integrations.MyAnimeList.searchAnime(
                            this.terms
                        );

                        results.push(
                            ...data.map(x => {
                                const res: ResultType = {
                                    title: x.title,
                                    description: x.description.replace(
                                        /(read more\.)$/,
                                        ""
                                    ),
                                    thumbnail: util.getHighResMALImage(
                                        x.thumbnail
                                    ),
                                    url: x.url,
                                    air: "",
                                    plugin: config.name,
                                    route: {
                                        path: "/anime",
                                        query: {
                                            url: x.url
                                        }
                                    },
                                    type: "anime",
                                    additional: {
                                        episodes: x.episodes,
                                        score: x.score
                                    }
                                };
                                return res;
                            })
                        );
                    } else if (config.category === "MyAnimeList-Manga") {
                        const data = await client.integrations.MyAnimeList.searchManga(
                            this.terms
                        );

                        results.push(
                            ...data.map(x => {
                                const res: ResultType = {
                                    title: x.title,
                                    description: x.description.replace(
                                        /(read more\.)$/,
                                        ""
                                    ),
                                    thumbnail: util.getHighResMALImage(
                                        x.thumbnail
                                    ),
                                    url: x.url,
                                    air: "",
                                    plugin: config.name,
                                    route: {
                                        path: "/manga",
                                        query: {
                                            url: x.url
                                        }
                                    },
                                    type: "manga",
                                    additional: {
                                        volumes: x.volumes,
                                        score: x.score
                                    }
                                };
                                return res;
                            })
                        );
                    } else if (config.category === "anime") {
                        const data = await client.anime[config.name].search(
                            this.terms
                        );

                        results.push(
                            ...data.map(x => {
                                const res: ResultType = {
                                    title: x.title,
                                    description: "",
                                    thumbnail: x.thumbnail,
                                    url: x.url,
                                    air: "",
                                    plugin: config.name,
                                    route: {
                                        path: "/anime/source",
                                        query: {
                                            plugin: config.name,
                                            url: x.url
                                        }
                                    },
                                    type: "anime"
                                };
                                return res;
                            })
                        );
                    } else if (config.category === "manga") {
                        const data = await client.manga[config.name].search(
                            this.terms
                        );

                        results.push(
                            ...data.map(x => {
                                const res: ResultType = {
                                    title: x.title,
                                    description: "",
                                    thumbnail: x.thumbnail || "",
                                    url: x.url,
                                    air: "",
                                    plugin: config.name,
                                    route: {
                                        path: "/manga/source",
                                        query: {
                                            plugin: config.name,
                                            url: x.url
                                        }
                                    },
                                    type: "manga"
                                };
                                return res;
                            })
                        );
                    }
                } catch (err) {
                    this.result.state = "failed";
                    return this.$logger.emit(
                        "error",
                        `Something went wrong: ${err?.message}`
                    );
                }
            }

            const rpc = await Rpc.getClient();
            this.result.data = results;
            this.result.state = "resolved";
            rpc?.({
                details: this.result.data.length
                    ? `Searching for ${this.terms} (${this.selectedPlugin})`
                    : "On Search Page"
            });

            const store = await Store.getClient();
            if (!this.$state.props.incognito) {
                const allSearchedEntities =
                    (await store.get(StoreKeys.recentlyBrowsed)) || [];

                allSearchedEntities.splice(0, 0, {
                    terms: this.terms,
                    searchedAt: Date.now(),
                    resultsFound: results.length,
                    route: {
                        route: this.$route.path,
                        queries: {
                            terms: this.terms,
                            plugins: [...this.selectedPlugin]
                        }
                    }
                });

                await store.set(
                    StoreKeys.recentlyBrowsed,
                    allSearchedEntities.slice(0, 50)
                );
            }
        },
        getValidImageUrl: util.getValidImageUrl
    }
});
</script>
