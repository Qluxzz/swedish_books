module Book exposing (Book, ViewOptions, decode, lifeSpanView, view)

import Dict
import Head.Seo exposing (book)
import Html
import Html.Attributes
import Json.Decode
import Route
import Serializer.Json.Extra
import Shared


type alias Book =
    { title : String
    , author : Author
    , year : Int
    , imageUrl : Maybe String
    , goodreads : Maybe Goodreads
    }


type alias Author =
    { id : Int, name : String, slug : String, lifeSpan : Maybe String }


type alias Goodreads =
    { avgRating : Float
    , ratings : Int
    , bookUrl : String
    }


imageHostToUrl : Dict.Dict String String
imageHostToUrl =
    Dict.fromList
        [ ( "tomasgift"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/tomasgift/libris-bib/{ID}/{ID}/orginal"
          )
        , ( "digi", "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/digi/libris-bib/{ID}/{ID}.jpg/orginal" )
        , ( "bokrondellen"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/bokrondellen/isbn/{ID}/{ID}.jpg/orginal"
          )
        , ( "author"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/author/libris-bib/{ID}/{ID}.jpg/orginal"
          )
        , ( "goodreads"
          , "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/{ID}._SX200_.jpg"
          )
        ]


toImageUrl : String -> String -> Maybe String
toImageUrl host id =
    imageHostToUrl
        |> Dict.get host
        |> Maybe.map (String.replace "{ID}" id)


decode : Json.Decode.Decoder Book
decode =
    Json.Decode.succeed
        (\title authorId authorName authorSlug lifeSpan year avgRating ratings bookUrl imageHost imageId ->
            { title = title
            , author = { id = authorId, name = authorName, slug = authorSlug, lifeSpan = lifeSpan }
            , year = year
            , imageUrl =
                Maybe.map2 toImageUrl imageHost imageId
                    |> Maybe.andThen identity
            , goodreads =
                Maybe.map3 Goodreads
                    avgRating
                    ratings
                    bookUrl
            }
        )
        |> Serializer.Json.Extra.andMap (Json.Decode.field "title" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_id" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_name" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_slug" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "author_life_span" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.field "year" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "avg_rating" Json.Decode.float))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "ratings" Json.Decode.int))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "book_url" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "image_host" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "image_id" Json.Decode.string))


type alias ViewOptions =
    { linkToAuthor : Bool, linkToYear : Bool }


view : ViewOptions -> Book -> Html.Html msg
view { linkToAuthor, linkToYear } book =
    let
        image =
            Html.div [ Html.Attributes.class "book-cover" ]
                (case book.imageUrl of
                    Just u ->
                        [ Html.img [ Html.Attributes.src u, Html.Attributes.alt <| "Omslag för " ++ book.title ] [] ]

                    Nothing ->
                        []
                )
    in
    Html.article [ Html.Attributes.class "book-card" ]
        [ image
        , Html.div [ Html.Attributes.class "book-info" ]
            [ Html.div [ Html.Attributes.class "book-details" ]
                [ Html.h3 [ Html.Attributes.class "book-title" ] [ Html.text book.title ]
                , bookAuthor linkToAuthor book.author
                ]
            , Html.hr [] []
            , Html.div [ Html.Attributes.class "book-meta" ]
                [ yearView book.year linkToYear
                , case book.goodreads of
                    Just r ->
                        Html.div [ Html.Attributes.class "book-rating" ]
                            [ Html.img [ Html.Attributes.class "rating-star", Html.Attributes.src "/star.svg" ] []
                            , Html.span [ Html.Attributes.class "rating-value" ] [ Html.text <| String.fromFloat r.avgRating ++ " (" ++ String.fromInt r.ratings ++ ")" ]
                            ]

                    Nothing ->
                        Html.text ""
                ]
            ]
        , Html.button [ Html.Attributes.class "find", Html.Attributes.tabindex 0 ] [ Html.text "Hitta boken!" ]
        , links book
        ]


bookAuthor : Bool -> Author -> Html.Html msg
bookAuthor linkToAuthor { id, name, slug, lifeSpan } =
    let
        displayName =
            Html.text <| ([ Just name, lifeSpanView lifeSpan ] |> List.filterMap identity |> String.join " ")
    in
    if linkToAuthor then
        Html.a [ Html.Attributes.href (Route.toString (Route.Author__Id___Name_ { id = String.fromInt id, name = slug })), Html.Attributes.class "book-author" ] [ displayName ]

    else
        Html.span [] [ displayName ]


goodreadsUrl : { r | bookUrl : String } -> String
goodreadsUrl { bookUrl } =
    "https://www.goodreads.com" ++ bookUrl


librisUrl : Book -> String
librisUrl { title, author } =
    "https://libris.kb.se/formatQuery.jsp?SEARCH_ALL=" ++ title ++ " " ++ author.name ++ "&d=libris&f=simp&spell=true"


adlibrisUrl : Book -> String
adlibrisUrl { title, author } =
    "https://www.adlibris.com/se/sok?q=" ++ title ++ " " ++ author.name


bokusUrl : Book -> String
bokusUrl { title, author } =
    "https://www.bokus.com/cgi-bin/product_search.cgi?ac_used=no&search_word=" ++ title ++ " " ++ author.name


links : Book -> Html.Html msg
links book =
    let
        urls =
            (case book.goodreads of
                Just r ->
                    [ ( "Goodreads", goodreadsUrl r ) ]

                Nothing ->
                    []
            )
                ++ [ ( "Libris", librisUrl book ), ( "Adlibris", adlibrisUrl book ), ( "Bokus", bokusUrl book ) ]
    in
    Html.div [ Html.Attributes.class "links" ]
        [ Html.ul []
            (List.map (\( title, url ) -> Html.li [] [ Shared.externalLink [ Html.Attributes.href url ] [ Html.text title ] ]) urls)
        ]


lifeSpanView : Maybe String -> Maybe String
lifeSpanView =
    Maybe.map (\s -> "(" ++ s ++ ")")


yearView : Int -> Bool -> Html.Html msg
yearView year createLink =
    let
        y =
            Html.span [ Html.Attributes.class "book-year" ] [ Html.text <| String.fromInt year ]
    in
    if createLink then
        Html.a [ Html.Attributes.href (Route.toString (Route.Year__Number_ { number = String.fromInt year })) ] [ y ]

    else
        y
