module BookList exposing (gridView, scrollableView, view)

import Book
import Html
import Html.Attributes
import Section


view : Book.ViewOptions -> List Book.Book -> List Book.Book -> List (Html.Html msg)
view viewOptions ratedBooks unratedBooks =
    [ if List.isEmpty ratedBooks then
        Html.text ""

      else
        Section.ratedBooks
            [ gridView viewOptions ratedBooks ]
    , if List.isEmpty unratedBooks then
        Html.text ""

      else
        Section.unratedBooks
            [ gridView viewOptions unratedBooks ]
    ]


gridView : Book.ViewOptions -> List Book.Book -> Html.Html msg
gridView viewOptions books =
    Html.div [ Html.Attributes.class "book-grid" ] (List.map (Book.view viewOptions) books)


scrollableView : Book.ViewOptions -> List Book.Book -> Html.Html msg
scrollableView viewOptions books =
    Html.div [ Html.Attributes.class "book-scroll-container" ] (List.map (Book.view viewOptions) books)
