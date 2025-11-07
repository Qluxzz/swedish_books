module Section exposing (default, ratedBooks, unratedBooks)

import Html
import Html.Attributes


default : String -> String -> List (Html.Html msg) -> Html.Html msg
default title description children =
    Html.section []
        ([ Html.h2 [ Html.Attributes.class "section-title" ]
            [ Html.text title ]
         , Html.p [ Html.Attributes.class "section-description" ] [ Html.text description ]
         ]
            ++ children
        )


ratedBooks : List (Html.Html msg) -> Html.Html msg
ratedBooks =
    default "Betygsatta böcker" "Dessa böcker hittades på Goodreads så de är åtminstone lite kända"


unratedBooks : List (Html.Html msg) -> Html.Html msg
unratedBooks =
    default "Mysterierna" "Dessa böcker är inte ens betygsatta, är de oslipade diamanter eller är de bortglömda av en anledning?"
